export interface AudioDevice {
    name: string;
    id: string;
}
export declare class DeviceManager {
    private static instance;
    private constructor();
    static getInstance(): DeviceManager;
    private resolveFfmpegPath;
    getInputDevices(): Promise<AudioDevice[]>;
    getOutputDevices(): Promise<AudioDevice[]>;
}
