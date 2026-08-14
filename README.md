# Caronitas

Portal para publicar e administrar caronas recorrentes ou avulsas, passageiros
e pagamentos do semestre.

- **Motorista**: gerencia caronas, passageiros e financeiro em `/admin`.
- **Passageiros**: consultam as caronas na página inicial, veem trajeto,
  horário, vagas e nomes confirmados, e solicitam uma vaga usando nome e
  celular, sem criar uma conta.

Stack: Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, Row
Level Security).

## 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (fica só no servidor,
     nunca compartilhe)
3. Copie `.env.local.example` para `.env.local` e preencha essas três
   variáveis.

## 2. Rodar as migrations

No painel do Supabase, abra **SQL Editor** e execute, nessa ordem, o
conteúdo de todos os arquivos em `supabase/migrations/`, na ordem numérica.
Isso cria as tabelas, funções e políticas de acesso.

Alternativa via terminal, com a connection string do banco (**Project
Settings → Database → Connection string**):

```bash
for migration in supabase/migrations/*.sql; do
  psql "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" \
    -v ON_ERROR_STOP=1 -f "$migration"
done
```

(Se preferir a Supabase CLI: `supabase link` seguido de `supabase db push`.)

## 3. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## 4. Criar sua conta de motorista

1. Em **Authentication → Users** no painel do Supabase, clique em "Add user"
   (ou "Invite") e crie sua própria conta (a da motorista) com e-mail e
   senha.
2. Isso cria automaticamente um registro em `profiles` com papel
   `passenger`. Promova essa conta a motorista rodando no **SQL Editor**:

   ```sql
   update profiles set role = 'driver' where id =
     (select id from auth.users where email = 'seu-email@exemplo.com');
   ```

3. Faça login em `/login` com esse e-mail/senha — você cairá em `/admin`.

## 5. Usar o painel

1. Em `/admin/config`, defina período do semestre, vagas e preço padrão.
2. Em `/admin/calendario`, escolha um dia e publique a carona informando
   origem, destino, tipo, horário, vagas e preço. A publicação pode se repetir
   semanalmente até o fim do semestre.
3. Em `/admin/passageiros`, cadastre pessoas, aplique caronas fixas em lote,
   filtre a lista e confirme os pagamentos pendentes.
4. Em `/admin/financeiro`, acompanhe faturado, valores em aberto, projeção e
   os gráficos do semestre.

## Deploy

Combinação recomendada: [Vercel](https://vercel.com) (grátis para uso
pessoal) apontando para este repositório, com as mesmas três variáveis de
ambiente configuradas no projeto da Vercel.

## Estrutura

- `supabase/migrations/` — schema completo (tabelas + RLS), em ordem.
- `src/lib/supabase/` — clientes Supabase (browser, server components,
  middleware, admin/service-role).
- `src/lib/balances.ts` — consolidação financeira por passageiro.
- `src/app/admin/` — área da motorista.
- `src/app/consulta/` — consulta pública do passageiro por celular.
