import { useState, useEffect, useCallback } from "react";
import { Button, Stack, TextInput, Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { RenderComponent } from "../UserGuide/UserGuide";
import InstallationModal from "../InstallationModal/InstallationModal";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";

/**
 * Represents the form values for the Unicornscan component.
 */
interface FormValuesType { 
    targetIP: string;
}

/**
 * The Unicornscan component.
 * @returns The Unicornscan component.
 */
const Unicornscan = () => {
    // Component state variables
    const [loading, setLoading] = useState(false); // State variable to indicate loading state
    const [output, setOutput] = useState(""); // State variable to store the output of the command execution
    const [allowSave, setAllowSave] = useState(false); // State variable to allow saving of output
    const [hasSaved, setHasSaved] = useState(false); // State variable to indicate if output has been saved
    const [isCommandAvailable, setIsCommandAvailable] = useState(false); // State variable to check if the command is available.
    const [opened, setOpened] = useState(!isCommandAvailable); // State variable that indicates if the modal is opened.
    const [loadingModal, setLoadingModal] = useState(true); // State variable to indicate loading state of the modal.
    const [pid, setPid] = useState(""); // State variable to store the process ID of the command execution.
    const [verboseMode, setVerboseMode] = useState(false); // State variable for verbose mode

    // Component Constants
    const title = "Unicornscan"; // Title of the component.
    const description = "Unicornscan is a tool used to used to gather information about systems and services on a network"; // Description of the component.
    const steps =
        "Step 1: Provide the target URL or IP address to scan.\n" +
        "Step 2: Start the scan to gather information about potential vulnerabilities and misconfigurations.\n" +
        "Step 3: Review the scan output to identify any security issues.\n";
    const sourceLink = "https://github.com/dneufeld/unicornscan"; // Link to the source code (or Kali Tools).
    const tutorial = ""; // Link to the official documentation/tutorial.
    const dependencies = ["unicornscan"]; // Contains the dependencies required by the component.
    
    // Form hook to handle form input
    let form = useForm({
        initialValues: {
            targetIP: "",
        },
    });

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
        setOutput((prevOutput) => prevOutput + "\n" + data); // Append new data to the previous output.
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

            // Clear the child process pid reference. There is no longer a valid process running.
            setPid("");

            // Cancel the loading overlay. The process has completed.
            setLoading(false);
        },
        [handleProcessData] // Dependency on the handleProcessData callback
    );

    /**
     * Handles form submission for the Masscan component.
     * @param {FormValuesType} values - The form values containing the target domain.
     */
    const onSubmit = async (values: FormValuesType) => {
        // Activate loading state to indicate ongoing process
        setLoading(true);

        // Construct arguments for the Masscan command based on form input
        let args = [];
        args = [values.targetIP];

        if (verboseMode) {
            args.push("-v"); // Add verbose mode option if enabled
        }

        // Execute the Masscan command via helper method and handle its output or potential errors
        CommandHelper.runCommandWithPkexec(
            "unicornscan",
            [...args, "-I"],
            handleProcessData,
            handleProcessTermination
        )
            .then(() => {
                // Deactivate loading state
                setLoading(false);
            })
            .catch((error) => {
                // Display any errors encountered during command execution
                setOutput(`Error: ${error.message}`);
                // Deactivate loading state
                setLoading(false);
            });
            setAllowSave(true);
    };
     /**
     * Handles the completion of output saving by updating state variables.
     */
     const handleSaveComplete = () => {
        setHasSaved(true); // Set hasSaved state to true
        setAllowSave(false); // Disallow further output saving
    };

    /**
     * Clears the command output and resets state variables related to output saving.
     */
    const clearOutput = () => {
        setOutput(""); // Clear the command output
        setHasSaved(false); // Reset hasSaved state
        setAllowSave(false); // Disallow further output saving
    };

    // Render component
    return (
        <RenderComponent
            title={title}
            description={description}
            steps={steps}
            tutorial={tutorial}
            sourceLink={sourceLink}
        >
            {!loadingModal && (
                <InstallationModal
                    isOpen={opened}
                    setOpened={setOpened}
                    feature_description={description}
                    dependencies={dependencies}
                />
            )}
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack>
                    {LoadingOverlayAndCancelButton(loading, pid)}
                    <TextInput label="IP Address" required {...form.getInputProps("targetIP")} />
                    <Checkbox
                        label="Verbose Mode"
                        checked={verboseMode}
                        onChange={(event) => setVerboseMode(event.currentTarget.checked)}
                    />
                    <Button type={"submit"}>Start {title}</Button>
                    {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                    <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
                </Stack>
            </form>
        </RenderComponent>
    );
};

export default Unicornscan;