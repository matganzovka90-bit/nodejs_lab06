export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SortParams<T extends string> {
    field: T;
    direction: 'asc' | 'desc';
}