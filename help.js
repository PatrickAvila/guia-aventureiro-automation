#!/usr/bin/env node
// automation/help.js
// Script de ajuda mostrando todos os comandos disponíveis

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║            🤖 AUTOMAÇÃO - GUIA AVENTUREIRO                        ║
║                  Scripts Consolidados                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

📋 SCRIPTS PRINCIPAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 GERENCIAMENTO DE USUÁRIOS (user.js)
   
   Verificar usuário:
   $ node user.js --email patrick@email.com
   
   Reset completo (roteiros + subscription + stats):
   $ node user.js --email patrick@email.com --action reset-all
   
   Deletar apenas roteiros:
   $ node user.js --email patrick@email.com --action reset-itineraries
   
   Resetar subscription para FREE:
   $ node user.js --email patrick@email.com --action reset-subscription
   
   Ver todas as opções:
   $ node user.js --help

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 GERENCIAMENTO DE ROTEIROS (itineraries.js)
   
   Listar todos os roteiros:
   $ node itineraries.js
   
   Listar roteiros de um usuário:
   $ node itineraries.js --email patrick@email.com
   
   Deletar roteiros de um usuário:
   $ node itineraries.js --email patrick@email.com --action delete
   
   Ver roteiros órfãos:
   $ node itineraries.js --action orphans
   
   Limpar órfãos:
   $ node itineraries.js --action cleanup-orphans
   
   Estatísticas:
   $ node itineraries.js --action stats
   
   Ver todas as opções:
   $ node itineraries.js --help

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 GERENCIAMENTO DE BANCO (database.js)
   
   Listar todos os usuários:
   $ node database.js
   
   Estatísticas gerais:
   $ node database.js --action stats
   
   Limpar usuários de teste:
   $ node database.js --action cleanup-test
   
   Resetar usuário de produção (para testes):
   $ node database.js --action reset-production --email patrick@email.com
   
   Ver todas as opções:
   $ node database.js --help

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


🎯 CASOS DE USO COMUNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Preparar ambiente para testes:
   1. $ node database.js --action cleanup-test
   2. $ node itineraries.js --action cleanup-orphans
   3. $ node user.js --email patrick@email.com --action reset-all
   4. $ node database.js --action stats

📊 Verificar estado atual:
   $ node database.js --action stats
   $ node itineraries.js --action stats
   $ node user.js --email patrick@email.com

🔄 Reset rápido de conta:
   $ node user.js --email patrick@email.com --action reset-all

🗑️  Limpeza geral:
   $ node database.js --action cleanup-test
   $ node itineraries.js --action cleanup-orphans


🧰 HELPERS DISPONÍVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

helpers/
├── database.js          MongoDB connections com timeouts
├── cloudinary.js        Operações de foto (delete)
├── user-operations.js   Operações de usuário (reset, delete)
└── queries.js           Queries comuns (get user, subscription, etc)

Use esses helpers em seus próprios scripts!


✅ TESTES AUTOMATIZADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Executar todos os testes:
$ npm test

Executar suite específica:
$ npm test auth.test.js
$ npm test itinerary.test.js

Status: 223/237 testes passando (94.1%)


📚 DOCUMENTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ver documentação completa:
$ cat SCRIPTS.md

Ver README de testes:
$ cat tests/README.md


⚠️  IMPORTANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• NUNCA rode scripts de reset em produção sem backup
• Confirme o ambiente antes de executar ações destrutivas
• Use --action check primeiro para verificar o que será afetado
• Scripts usam MongoDB nativo (backend pode estar rodando)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Dica: Todos os scripts aceitam --help para mais informações

`);
