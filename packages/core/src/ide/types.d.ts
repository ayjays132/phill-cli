/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
/**
 * A file that is open in the IDE.
 */
export declare const FileSchema: any;
export type File = z.infer<typeof FileSchema>;
/**
 * The context of the IDE.
 */
export declare const IdeContextSchema: any;
export type IdeContext = z.infer<typeof IdeContextSchema>;
/**
 * A notification that the IDE context has been updated.
 */
export declare const IdeContextNotificationSchema: any;
/**
 * A notification that a diff has been accepted in the IDE.
 */
export declare const IdeDiffAcceptedNotificationSchema: any;
/**
 * A notification that a diff has been rejected in the IDE.
 */
export declare const IdeDiffRejectedNotificationSchema: any;
/**
 * This is defined for backwards compatibility only. Newer extension versions
 * will only send IdeDiffRejectedNotificationSchema.
 *
 * A notification that a diff has been closed in the IDE.
 */
export declare const IdeDiffClosedNotificationSchema: any;
/**
 * The request to open a diff view in the IDE.
 */
export declare const OpenDiffRequestSchema: any;
/**
 * The request to close a diff view in the IDE.
 */
export declare const CloseDiffRequestSchema: any;
