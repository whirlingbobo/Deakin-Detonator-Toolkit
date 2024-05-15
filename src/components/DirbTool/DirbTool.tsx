import { Button, Checkbox, Stack, TextInput, Switch } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState, useEffect } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { RenderComponent } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";

/**
 *  Represents the form values for the DirbTool Component.
 */    
interface FormValuesType {
    url: string;
    wordListPath?: string; // Made wordlistPath optional.
    caseInsensitive: boolean;
    printLocation: boolean;
    ignoreHttpCode: number;
}
//Component Constants
const title = "Dirb"; //Title of the component.
const description = "Dirb is a Web Content Scanner. It looks for existing (and/or hidden) Web Objects. " +  // Description of the component.
                    "This is a dictionary-based attack that takes place upon a web server and will analyse the "; 
const steps =   "Step 1: Enter a valid URL.\n" +
                "E.g. https://www.deakin.edu.au\n\nStep 2: Enter a file directory pathway to access " +
                "a wordlist\nE.g. home/wordlist/wordlist.txt\n\nStep 3: Click Scan to commence " +
                "the Dirb operation.\n\nStep 4: View the Output block below to view the results of the tool's execution.";
const sourceLink = ""; // Link to the source code (or Kali Tools).
const tutorial = ""; // Link to the official documentation/tutorial.
const dependencies = ["dirb"]; // Contains the dependencies required by the component.

    
/**
 * The DirbTool component.
 * @returns The DirbTool component.
 */
const DirbTool = () => {
    //Component State Variables.
    const [loading, setLoading] = useState(false); //State variable to indicate loading state.
    const [output, setOutput] = useState(""); //State variable to store the output.
    const [checkedAdvanced, setCheckedAdvanced] = useState(false); //State variable to verify Advanced setup. 
    const [pid, setPid] = useState(""); //State variable to store the process of the ID for command execution.
    const [isCommandAvailable, setIsCommandAvailable] = useState(false); // State variable to check if the command is available.
    const [opened, setOpened] = useState(!isCommandAvailable); // State variable that indicates if the modal is opened.
    const [loadingModal, setLoadingModal] = useState(true); // State variable to indicate loading state of the modal.

    const [allowSave, setAllowSave] = useState(false); //State variable to enable saving.
    const [hasSaved, setHasSaved] = useState(false); //State variable to verify data saved.
    const [silentMode, setSilentMode] = useState(false); // Track silent mode state.

// Form hook to handle form input.
    const form = useForm({
        initialValues: {
            url: "",
            wordlistPath: "", // Set initial value to an empty string.
            caseInsensitive: false,
            printLocation: false,
            ignoreHttpCode: 0,
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
     * handleProcessData: Callback to handle and append new data from the child process to the output.
     * It updates the state by appending the new data received to the existing output.
     * @param {string} data - The data received from the child process.
     */
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Update output.
    }, []);

    /**
     * handleProcessTermination: Callback to handle the termination of the child process.
     * Once the process termination is handled, it clears the process PID reference and
     * deactivates the loading overlay.
     * @param {object} param - An object containing information about the process termination.
     * @param {number} param.code - The exit code of the terminated process.
     * @param {number} param.signal - The signal code indicating how the process was terminated.
     */
    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            // If the process was successful, display a success message.
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");

                // If the process was terminated manually, display a termination message.                
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");

                // If the process was terminated with an error, display the exit and signal codes.
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            
            // Clear the child process pid reference.
            setPid("");

            // Cancel the Loading Overlay.
            setLoading(false);

            // Allow Saving as the output is finalised.
            setAllowSave(true);
            setHasSaved(false);
        },
        [handleProcessData]
    );

    // Actions taken after saving the output.
    const handleSaveComplete = () => {
        // Indicating that the file has saved which is passed
        // back into SaveOutputToTextFile to inform the user
        setHasSaved(true);
        setAllowSave(false);
    };

    /**
     * onSubmit: Asynchronous handler for the form submission event.
     * It sets up and triggers the airbase-ng tool with the given parameters.
     * Once the command is executed, the results or errors are displayed in the output.
     *
     * @param {FormValuesType} values - The form values, containing the url, string , etc.
     */    
    const onSubmit = async (values: FormValuesType) => {
        // Disallow saving until the tool's execution is complete.
        setAllowSave(false);

        // Enable the Loading Overlay.
        setLoading(true);

        //Action Taken depending on if a wordListPath is provided.
        const args = [values.url];
        if (values.wordListPath) {
            args.push(values.wordListPath); // Add wordlist path if provided.
        }
        if (silentMode) {
            args.push("-S"); // Include silent mode flag.
        }

        // Only add advanced mode parameters if checkedAdvanced is true.
        if (checkedAdvanced) {
            if (values.caseInsensitive) {
                // Add the -i flag to make the search case-insensitive.
                args.push("-i");
            }

            if (values.printLocation) {
                // Add the -l flag to print the location of the match.
                args.push("-l");
            }

            if (values.ignoreHttpCode) {
                // Add the -N flag followed by the HTTP response code to ignore.
                args.push("-N", values.ignoreHttpCode.toString());
            }
        }

        // Execute the Dirb command via helper method and handle its output or potential errors.
        CommandHelper.runCommandGetPidAndOutput("dirb", args, handleProcessData, handleProcessTermination)
            .then(({ pid, output }) => {
                setPid(pid);
                setOutput(output);
            })
            .catch((error) => {
                setLoading(false);
                setOutput(`Error: ${error.message}`);
            });
    };

    /**
     * Clears the output state.
     */    
    const clearOutput = useCallback(() => {
        setOutput("");
        setHasSaved(false);
        setAllowSave(false);
    }, [setOutput]);

    return (
        <RenderComponent //RenderComponent enables tabs for the UserGuide.
            title={title}
            description={description}
            steps={steps}
            tutorial={tutorial}
            sourceLink={sourceLink}>

        <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
            {LoadingOverlayAndCancelButton(loading, pid)}
            <Stack>
                <Switch
                    size="md"
                    label="Advanced Mode"
                    checked={checkedAdvanced}
                    onChange={(e) => setCheckedAdvanced(e.currentTarget.checked)}
                />
                <Switch
                    size="md"
                    label="Slient Mode"
                    checked={silentMode}
                    onChange={(e) => setSilentMode(e.currentTarget.checked)}
                />
                <TextInput label={"URL"} required {...form.getInputProps("url")} />
                <TextInput label={"Path to wordlist"} {...form.getInputProps("wordlistPath")} />
                {checkedAdvanced && (
                    <>
                        <Checkbox label={"Use case-insensitive search"} {...form.getInputProps("caseInsensitive")} />
                        <Checkbox
                            label={"Print 'Location' header when found"}
                            {...form.getInputProps("printLocation")}
                        />
                        <TextInput
                            label={"Ignore responses with this HTTP code"}
                            type="number"
                            {...form.getInputProps("ignoreHttpCode")}
                        />
                    </>
                )}
                <Button type={"submit"}>{checkedAdvanced ? "Scan (Advanced)" : "Scan"}</Button>
                {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
            </Stack>
        </form>
        </RenderComponent>
    );
}


export default DirbTool;
