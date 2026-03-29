import { UserStatus, Role } from "../../../generated/prisma/enums"; // Import from your generated Prisma enums

export interface IUpdateAdminPayload {
    admin?: {
        name?: string;
        profilePhoto?: string;
        contactNumber?: string;
    }
}

export interface IChangeUserStatusPayload {
    userId: string;
    status: UserStatus; // Changed from userStatus to status to match service usage
}

export interface IChangeUserRolePayload {
    userId: string;
    role: Role; // Use Role from your generated Prisma enums, not from better-auth
}