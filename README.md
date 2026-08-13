# Caronitas

Site para controlar as caronas do semestre: calendário com as vagas do carro,
quem vai em cada carona (passageiros fixos e avulsos) e o financeiro de cada
passageiro (quanto deve, quanto já pagou).

- **Motorista**: gerencia calendário, passageiros, padrões fixos semanais e
  pagamentos em `/admin`.
- **Passageiros**: têm login próprio, veem suas caronas em
  `/minhas-caronas`, confirmam/cancelam presença e acompanham o saldo em
  `/minhas-caronas/financeiro`.

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

No painel do Supabase, abra **SQL Editor**, cole o conteúdo de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e
execute. Isso cria as tabelas, as policies de RLS e o gatilho que cria um
perfil automaticamente para cada novo usuário (papel padrão: `passenger`).

(Se preferir usar a Supabase CLI: `supabase link` seguido de
`supabase db push`.)

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

## 5. Configurar e convidar passageiros

1. Em `/admin/config`, defina quantas vagas o carro tem, o preço padrão da
   carona e (opcionalmente) o início/fim do semestre.
2. Em `/admin/passageiros`, convide cada passageiro (nome + e-mail) — isso
   envia um e-mail de convite do Supabase Auth para eles definirem senha.
   Depois, cadastre o padrão fixo semanal de cada um (dia da semana, preço,
   período de vigência).
3. Volte em `/admin/config` e clique em "Gerar caronas do período" para
   expandir os padrões fixos em caronas concretas no calendário. Pode rodar
   de novo quando adicionar um novo padrão — não duplica o que já existe.
4. Ajustes pontuais (feriado, falta, passageiro avulso) são feitos
   diretamente no dia, em `/admin/calendario`.

## Deploy

Combinação recomendada: [Vercel](https://vercel.com) (grátis para uso
pessoal) apontando para este repositório, com as mesmas três variáveis de
ambiente configuradas no projeto da Vercel.

## Estrutura

- `supabase/migrations/0001_init.sql` — schema completo (tabelas + RLS).
- `src/lib/supabase/` — clientes Supabase (browser, server components,
  middleware, admin/service-role).
- `src/lib/balances.ts` — cálculo do saldo de cada passageiro (caronas
  confirmadas − pagamentos).
- `src/app/admin/` — área da motorista.
- `src/app/minhas-caronas/` — área do passageiro.
