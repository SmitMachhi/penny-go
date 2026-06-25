export type Json = boolean | number | string | null | Json[] | { [key: string]: Json };

export type Database = {
	public: {
		Tables: {
			penny_sessions: {
				Row: {
					created_at: string;
					session_key: string;
					session_uuid: string;
					title: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					session_key: string;
					session_uuid: string;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					session_key?: string;
					session_uuid?: string;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
