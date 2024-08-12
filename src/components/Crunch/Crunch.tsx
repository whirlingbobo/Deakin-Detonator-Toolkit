import { Button, LoadingOverlay, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState, useEffect } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { RenderComponent } from "../UserGuide/UserGuide";
import { UserGuide } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButtonPkexec } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";
import InstallationModal from "../InstallationModal/InstallationModal";

const title = "Crunch Password Generator";
const description_userguide =
    "Crunch is a wordlist generator where you can specify a standard character set or a custom one based on the " +
    "needs of your project. Crunch can create a wordlist based on criteria you specify. The wordlist can be " +
    "used for various purposes such as dictionary attacks or password cracking.\n\nYou can find more information " +
    "about the tool, including usage instructions and examples, in its official documentation: https://tools.kali." +
    "org/password-attacks/crunch\n\n" +
    "Using Crunch:\n" +
    "Step 1: Enter a Minimum password length.\n" +
    "       Eg: 8\n\n" +
    "Step 2: Enter a Maximum password length.\n" +
    "       Eg: 8\n\n" +
    "Step 3: Enter a Character set for the password generation.\n" +
    "       Eg: abcdefghijklmnopqrstuvwxyz123456789\n\n" +
    "Step 4: (Optional) Enter the directory for an Output file.\n\n" +
    "Step 5: Click Generate Password List to commence Crunch's operation.\n\n" +
    "Step 6: View the Output block below to view the results of the tools execution.";

/**
 * Represents the form values for the Crunch component.
 */
interface FormValuesType {
    minLength: number;
    maxLength: number;
    charset: string;
    outputFile: string;
}

/**
 * The Crunch component.
 * @returns The Crunch component.
 */
const Crunch = () => {
    //component state variables
    //sets the state of the tool; loading or not, what the output is
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [pid, setPid] = useState("");
    const [isCommandAvailable, setIsCommandAvailable] = useState(false); // State variable to check if the command is available.
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [opened, setOpened] = useState(!isCommandAvailable); // State variable that indicates if the modal is opened.
    const [loadingModal, setLoadingModal] = useState(true); // State variable to indicate loading state of the modal.

    // Component Constants.
    const title = "Crunch"; // Title of the component.
    const description =
        "Crunch is a wordlist generator where you can specify a standard character set or any set of characters to be used in generating the wordlists."; // Description of the component.
    const steps =
        "Using Crunch:\n" +
        "Step 1: Enter a Minimum password length.\n" +
        "           Eg: 8\n\n" +
        "Step 2: Enter a Maximum password length.\n" +
        "       Eg: 8\n\n" +
        "Step 3: Enter a Character set for the password generation.\n" +
        "       Eg: abcdefghijklmnopqrstuvwxyz123456789\n\n" +
        "Step 4: (Optional) Enter the directory for an Output file.\n\n" +
        "Step 5: Click Generate Password List to commence Crunch's operation.\n\n" +
        "Step 6: View the Output block below to view the results of the tools execution.";

    const sourceLink = "https://www.kali.org/tools/crunch/"; // Link to the source code (or Kali Tools).
    const tutorial = ""; // Link to the official documentation/tutorial.
    const dependencies = ["Crunch"]; // Contains the dependencies required by the component.

    //initial form values
    //Update initial value for minLength = 3, maxLength = 4, charset = abcde
    //If use select the current initial values the execution time will be very long
    let form = useForm({
        initialValues: {
            minLength: 3,
            maxLength: 4,
            charset: "abcde",
            outputFile: "",
        },
    });

    // Check if the command is available and set the state variables accordingly.
    useEffect(() => {
        // Check if the command is available and set the state variables accordingly.
        checkAllCommandsAvailability(dependencies)
            .then((isAvailable) => {
                setIsCommandAvailable(isAvailable); // Set the command availability state
                setOpened(!isAvailable); // Set the modal state to opened if the command is not available
                setLoadingModal(false); // Set loading to false after the check is done
            })
            .catch((error) => {
                console.error("An error occurred:", error);
                setLoadingModal(false); // Also set loading to false in case of error
            });
    }, []);

    /**
     * Callback function to handle data generated by the executing process.
     * Appends the data to the current output.
     * @param {string} data - The data output from the running process.
     */
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Update output
    }, []);

    /**
     * Callback function to handle the termination of the process.
     * Resets the state variables, handles the output data, and informs the user.
     * @param {{ code: number; signal: number }} result - The result of the process termination.
     */
    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            // Clear the child process pid reference
            setPid("");
            // Cancel the Loading Overlay
            setLoading(false);

            // Allow Saving as the output is finalised
            setAllowSave(true);
            setHasSaved(false);
        },
        [handleProcessData]
    );

    /**
     * Handles actions taken after saving the output, such as updating the save status.
     */
    const handleSaveComplete = () => {
        // Indicating that the file has saved which is passed
        // back into SaveOutputToTextFile to inform the user
        setHasSaved(true);
        setAllowSave(false);
    };

    /**
     * Handles form submission, setting the loading state and running the Crunch command.
     * @param {FormValuesType} values - The values submitted through the form.
     */
    const onSubmit = async (values: FormValuesType) => {
        // Disallow saving until the tool's execution is complete
        setAllowSave(false);

        setLoading(true);

        const args = [`${values.minLength}`, `${values.maxLength}`, `${values.charset}`];

        //pushes the output file argument if one is provided by user
        if (values.outputFile) {
            args.push("-o", values.outputFile);
        }

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "crunch",
                args,
                handleProcessData,
                handleProcessTermination
            );
            setPid(result.pid);
            setOutput(result.output);
        } catch (e: any) {
            setOutput(e.message);
        }
    };

    /**
     * Clears the output state.
     * Resets the save status and disallows further saves until new output is generated.
     */
    const clearOutput = useCallback(() => {
        setOutput("");
        setHasSaved(false);
        setAllowSave(false);
    }, [setOutput]);

    return (
        //define user interface of the tool
        <form onSubmit={form.onSubmit(onSubmit)}>
            {/* {LoadingOverlayAndCancelButtonPkexec(loading, pid)} */}
            {LoadingOverlayAndCancelButtonPkexec(loading, pid, handleProcessData, handleProcessTermination)}

            <LoadingOverlay visible={loading} />
            <Stack>
                {UserGuide(title, description_userguide)}
                <TextInput
                    label={"Minimum password length"}
                    type="number"
                    min={1}
                    required
                    {...form.getInputProps("minLength")}
                />
                <TextInput
                    label={"Maximum password length"}
                    type="number"
                    min={1}
                    required
                    {...form.getInputProps("maxLength")}
                />
                <TextInput
                    label={"Character set (e.g. abcdefghijklmnopqrstuvwxyz0123456789)"}
                    required
                    {...form.getInputProps("charset")}
                />
                <TextInput label={"Output file (optional)"} {...form.getInputProps("outputFile")} />
                <Button type={"submit"}>Generate Password List</Button>
                {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
            </Stack>
        </form>
    );
};

export default Crunch;
