export declare function successResponse(data: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function errorResponse(error: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
};
