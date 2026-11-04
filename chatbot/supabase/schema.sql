-- Ask Mahi: run once in Supabase → SQL Editor.
create extension if not exists vector;

-- Knowledge base chunks (384 dims = BAAI/bge-small-en-v1.5)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(384) not null,
  created_at timestamptz not null default now()
);
create index if not exists documents_embedding_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

-- Signature expected by LangChain's SupabaseVectorStore
create or replace function public.match_documents(
  query_embedding vector(384),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
) returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable as $$
  select d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.metadata @> filter
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Conversation log (useful for seeing what recruiters actually ask)
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- Lock both tables: only the backend's service-role key may read/write.
alter table public.documents enable row level security;
alter table public.chat_messages enable row level security;
