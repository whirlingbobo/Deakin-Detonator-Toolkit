import { Button, LoadingOverlay, Stack, TextInput, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { IconAlertCircle } from "@tabler/icons";
import { UserGuide } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";

const title = "SMG-Ghost Scanner";
const description_userguide =
    "SMG-Ghost Scanner is a tool used to scan a target to see if they are vulnerable to the attack vector " +
    "CVE2020-0796. This vulnerability fell within Microsoft's SMB 3.1.1 protocol stack implementation where " +
    "due to the failure of handling particular requests and response messages, an attacker could perform " +
    "remote code execution to act as the systems user.\n\n" +
    "Using SMG-Ghost Scanner:\n" +
    "Step 1: Enter a Target IP address.\n" +
    "       Eg: 192.168.1.1 \n\n" +
    "Step 2: Click scan to commence SMG-Ghost Scanners operation.\n\n" +
    "Step 3: View the Output block below to view the results of the tools execution.";

interface FormValues {
    ip: string;
}
const SMGGhostScanner = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [pid, setPid] = useState("");

    let form = useForm({
        initialValues: {
            ip: "",
        },
    });

    // Uses the callback function of runCommandGetPidAndOutput to handle and save data
    // generated by the executing process into the output state variable.
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Update output
    }, []);

    // Uses the onTermination callback function of runCommandGetPidAndOutput to handle
    // the termination of that process, resetting state variables, handling the output data,
    // and informing the user.
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

    // Actions taken after saving the output
    const handleSaveComplete = () => {
        // Indicating that the file has saved which is passed
        // back into SaveOutputToTextFile to inform the user
        setHasSaved(true);
        setAllowSave(false);
    };

    const onSubmit = async (values: FormValues) => {
        // Disallow saving until the tool's execution is complete
        setAllowSave(false);
        // Start the Loading Overlay
        setLoading(true);

        const args = [`./exploits/SMGGhostScanner.py`, values.ip];

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "python3",
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

    const clearOutput = useCallback(() => {
        setOutput("");

        // reset save state variables to defaults
        setHasSaved(false);
        setAllowSave(false);
    }, [setOutput]);

    return (
        <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
            {LoadingOverlayAndCancelButton(loading, pid)}
            <Stack>
                {UserGuide(title, description_userguide)}
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    radius="md"
                    children={
                        "Please turn off the firewall on target system, otherwise the detect packet might be dropped. "
                    }
                ></Alert>
                <TextInput label={"Target IP address"} required {...form.getInputProps("ip")} />
                <Button type={"submit"}>Scan</Button>
                {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
            </Stack>
        </form>
    );
};

export default SMGGhostScanner;
