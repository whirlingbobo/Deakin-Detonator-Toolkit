import { useState, useEffect, useCallback } from "react";
import { Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { LoadingOverlayAndCancelButtonPkexec } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { RenderComponent } from "../UserGuide/UserGuide";
import InstallationModal from "../InstallationModal/InstallationModal";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile"; //v2

/**
 * Represents the form values for the Tiger component.
 */
interface FormValuesType {
    reportFile: string;
}

/**
 * The Tiger component.
 * @returns The Tiger component.
 */
const Tiger = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [isCommandAvailable, setIsCommandAvailable] = useState(false);
    const [opened, setOpened] = useState(!isCommandAvailable);
    const [loadingModal, setLoadingModal] = useState(true);
    const [pid, setPid] = useState("");

    const title = "Tiger";
    //const description = "Tiger is a security audit tool for Unix-based systems.";
    const steps =
        "Step 1: Specify a file to save the audit report.\n" +
        "Step 2: Click the Start " +
        title +
        " button and view the output block for the result. ";
        const description = `
        Tiger is a comprehensive security audit tool for Unix-based systems. 
        It automates security checks, including file permissions, software configurations, and potential vulnerabilities, 
        to ensure system integrity and compliance.
        
        Key Features:
        - Identifies misconfigured file permissions and weak passwords.
        - Analyzes system configurations for vulnerabilities.
        - Generates a detailed audit report.
        
        Usage Notes:
        - Make sure to run Tiger with elevated permissions (e.g., using 'pkexec') to perform a full system audit.
        - Specify a valid file path to save the audit report (e.g., '/tmp/tiger_report.txt').
        
        This tool is ideal for administrators and security professionals looking to enhance the security posture of Unix-based systems.
        `;
        
    const sourceLink = "https://www.kali.org/tools/tiger/";
    const dependencies = ["tiger"];
    const tutorial =
        "Tiger is a tool that automates security audits on Unix-based systems. It checks file permissions, software configuration, and system vulnerabilities. It's essential to specify where to save the report with the '-l' option. Run Tiger with higher permissions using 'pkexec' for a comprehensive audit.";

    let form = useForm({
        initialValues: {
            reportFile: "",
        },
    });

    useEffect(() => {
        checkAllCommandsAvailability(dependencies)
            .then((isAvailable) => {
                setIsCommandAvailable(isAvailable);
                setOpened(!isAvailable);
                setLoadingModal(false);
            })
            .catch((error) => {
                console.error("An error occurred:", error);
                setLoadingModal(false);
            });
    }, []);

    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data);
    }, []);

    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number | null }) => {
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            setPid("");
            setLoading(false);
        },
        [handleProcessData]
    );

    const onSubmit = async (values: FormValuesType) => {
        setLoading(true);

        let args = ["-l", values.reportFile];

        CommandHelper.runCommandWithPkexec("tiger", args, handleProcessData, handleProcessTermination)
            .then(({ output, pid }) => {
                setOutput(output);
                setAllowSave(true);
                setPid(pid);
            })
            .catch((error) => {
                setOutput(`Error: ${error.message}`);
                setLoading(false);
            });
    };

    const handleSaveComplete = () => {
        setHasSaved(true);
        setAllowSave(false);
    };

    const clearOutput = () => {
        setOutput("");
        setHasSaved(false);
        setAllowSave(false);
    };

    return (
        <RenderComponent
            title={title}
            description={description}
            steps={steps}
            sourceLink={sourceLink}
            tutorial={tutorial}
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
                    {LoadingOverlayAndCancelButtonPkexec(loading, pid, handleProcessData, handleProcessTermination)}
                    <TextInput
                        label="Report File"
                        required
                        {...form.getInputProps("reportFile")}
                        placeholder="e.g. /path/to/report.txt"
                    />
                    {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                    <Button type="submit">Start {title}</Button>
                    <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
                </Stack>
            </form>
        </RenderComponent>
    );
};

export default Tiger;
