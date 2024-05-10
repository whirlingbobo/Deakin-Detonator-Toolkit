import { Button, Stack, TextInput, Switch, NativeSelect, NumberInput, Grid } from "@mantine/core";
import { useForm } from "@mantine/form";
import { RenderComponent } from "../UserGuide/UserGuide";
import { useCallback, useState, useEffect } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { UserGuide } from "../UserGuide/UserGuide";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { SaveOutputToTextFile } from "../SaveOutputToFile/SaveOutputToTextFile";
import InstallationModal from "../InstallationModal/InstallationModal";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";

const enumerationtypes = [
    "Vulnerable plugins",
    "All Plugins",
    "Popular Plugins",
    "Vulnerable themes",
    "All themes",
    "Popular themes",
    "Timthumbs",
    "Config Backups",
    "Db exports",
    "UID range",
    "MID range",
    "Custom",
];
const enumerationRequiringRange = ["UID range", "MID range"];
const detectionModes = ["mixed", "passive", "aggressive"];
const outputFormats = ["cli-no-colour", "cli-no-color", "json", "cli"];

interface FormValues {
    url: string;
    lowBound: number;
    upBound: number;
    customEnum: string;
    verbose: boolean;
    output: string;
    format: string;
    passwords: string;
    usernames: string;
    stealthy: boolean;
    custom: string;
}

const WPScan = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [checkedAdvanced, setCheckedAdvanced] = useState(false);
    const [checkedCustom, setCheckedCustom] = useState(false);
    const [selectedEnumerationType, setselectedEnumerationType] = useState("");
    const [selectedDetectionMode, setSelectedDetectionMode] = useState("");
    const [selectedOutputFormat, setSelectedOutputFormat] = useState("");
    const [verboseChecked, setVerboseChecked] = useState(false);
    const [stealthyChecked, setStealthyChecked] = useState(false);
    const [pid, setPid] = useState("");
    const [isCommandAvailable, setIsCommandAvailable] = useState(false);
    const [loadingModal, setLoadingModal] = useState(true);
    const [opened, setOpened] = useState(!isCommandAvailable);

    const title = "WPScan";
    const description = "WPScan scans remote WordPress installations to find security issues";
    const steps =
        "Step 1: Enter a WordPress URL.\n" +
        "Step 2: Enter any additional options for the scan.\n" +
        "Step 3: Enter any additional parameters for the scan.\n" +
        "Step 4: Click Scan to commence WPScan's operation.\n" +
        "Step 5: View the Output block below to view the results of the tool's execution.\n";
    const sourceLink = "https://www.kali.org/tools/wpscan/";
    const tutorial = "";
    const dependencies = ["wpscan"];

    let form = useForm({
        initialValues: {
            url: "",
            lowBound: 0,
            upBound: 0,
            customEnum: "",

            verbose: false,
            output: "",
            format: "",
            stealthy: false,
            passwords: "",
            usernames: "",
            custom: "",
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
        },
        [handleProcessData]
    );

    const onSubmit = async (values: FormValues) => {
        setLoading(true);

        const args = [`--url`, values.url];

        //Insantiate enumeration arguments
        if (selectedEnumerationType != "" && checkedAdvanced) {
            selectedEnumerationType === "Vulnerable plugins" ? args.push(`-e`, `vp`) : undefined;
            selectedEnumerationType === "All Plugins" ? args.push(`-e`, `ap`) : undefined;
            selectedEnumerationType === "Popular Plugins" ? args.push(`-e`, `p`) : undefined;
            selectedEnumerationType === "Vulnerable themes" ? args.push(`-e`, `vt`) : undefined;
            selectedEnumerationType === "All themes" ? args.push(`-e`, `at`) : undefined;
            selectedEnumerationType === "Popular themes" ? args.push(`-e`, `t`) : undefined;
            selectedEnumerationType === "Timthumbs" ? args.push(`-e`, `tt`) : undefined;
            selectedEnumerationType === "Config Backups" ? args.push(`-e`, `cb`) : undefined;
            selectedEnumerationType === "Db exports" ? args.push(`-e`, `dbe`) : undefined;
            selectedEnumerationType === "UID range"
                ? args.push(`-e`, `u${values.lowBound}-${values.upBound}`)
                : undefined;
            selectedEnumerationType === "MID range"
                ? args.push(`-e`, `m${values.lowBound}-${values.upBound}`)
                : undefined;
            selectedEnumerationType === "Custom" ? args.push(`-e`, `${values.customEnum}`) : undefined;
        }

        if (selectedDetectionMode) {
            args.push(`detection-mode`, `${selectedDetectionMode}`);
        }

        if (verboseChecked) {
            args.push(`-v`);
        }

        if (selectedOutputFormat) {
            args.push(`-f`, `${selectedOutputFormat}`);
        }
        if (stealthyChecked) {
            args.push(`--stealthy`);
        }

        if (values.passwords) {
            args.push(`--passwords`, `${values.passwords}`);
        }
        if (values.usernames) {
            args.push(`--usernames`, `${values.usernames}`);
        }
        if (values.output) {
            args.push(`-o`, `${values.output}`);
        }

        if (checkedCustom) {
            args.push(`${values.custom}`);
        }

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "wpscan",
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
    }, [setOutput]);

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
                ></InstallationModal>
            )}
            <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
                {LoadingOverlayAndCancelButton(loading, pid)}
                <Stack>
                    <TextInput
                        label={"URL of target wordpress site"}
                        placeholder={"Example: http://www.wordpress.com/sample"}
                        required
                        {...form.getInputProps("url")}
                    />
                    <Switch
                        size="md"
                        label="Advanced Mode"
                        checked={checkedAdvanced}
                        onChange={(e) => setCheckedAdvanced(e.currentTarget.checked)}
                    />
                    {checkedAdvanced && (
                        <>
                            <Switch
                                size="md"
                                label="Stealthy"
                                checked={stealthyChecked}
                                onChange={(e) => setStealthyChecked(e.currentTarget.checked)}
                            />
                            <Switch
                                size="md"
                                label="Verbose"
                                checked={verboseChecked}
                                onChange={(e) => setVerboseChecked(e.currentTarget.checked)}
                            />
                            <NativeSelect
                                value={selectedEnumerationType}
                                onChange={(e) => setselectedEnumerationType(e.target.value)}
                                title={"Enumeration Options"}
                                data={enumerationtypes}
                                placeholder={"Types"}
                                description={"Please select an enumeration type"}
                            />
                            {enumerationRequiringRange.includes(selectedEnumerationType) && (
                                <>
                                    <Grid>
                                        <Grid.Col span={6}>
                                            <NumberInput
                                                label={"Lower Range"}
                                                placeholder={"e.g. 1"}
                                                {...form.getInputProps("lowbound")}
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={6}>
                                            <NumberInput
                                                label={"Upper Range"}
                                                placeholder={"e.g. 5"}
                                                {...form.getInputProps("upbound")}
                                            />
                                        </Grid.Col>
                                    </Grid>
                                </>
                            )}
                            {selectedEnumerationType === "Custom" && (
                                <TextInput
                                    label={"Custom Enumeration"}
                                    placeholder={"e.g. vp ap u1-5"}
                                    {...form.getInputProps("customenum")}
                                />
                            )}
                            <NativeSelect
                                value={selectedDetectionMode}
                                onChange={(e) => setSelectedDetectionMode(e.target.value)}
                                title={"Detectionmode"}
                                data={detectionModes}
                                placeholder={"Detection Modes"}
                                description={"Please select a detection type"}
                            />
                            <TextInput
                                label={"Ouput to file"}
                                placeholder={"File Name"}
                                {...form.getInputProps("output")}
                            />
                            <NativeSelect
                                value={selectedOutputFormat}
                                onChange={(e) => setSelectedOutputFormat(e.target.value)}
                                title={"Output Format"}
                                data={outputFormats}
                                placeholder={"Output Format"}
                                description={"Please select an output format"}
                            />
                            <TextInput
                                label={" List of passwords to use during the password attack."}
                                placeholder={"Input Filepath"}
                                {...form.getInputProps("passwords")}
                            />
                            <TextInput
                                label={"List of usernames to use during the password attack."}
                                placeholder={"Input Filepath"}
                                {...form.getInputProps("usernames")}
                            />
                        </>
                    )}
                    <Switch
                        size="md"
                        label="Custom Mode"
                        checked={checkedCustom}
                        onChange={(e) => setCheckedCustom(e.currentTarget.checked)}
                    />
                    {checkedCustom && <TextInput label={"Custom Configuration"} {...form.getInputProps("custom")} />}

                    <Button type={"submit"}>Scan</Button>
                    {SaveOutputToTextFile(output)}
                    <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
                </Stack>
            </form>
        </RenderComponent>
    );
};

export default WPScan;
