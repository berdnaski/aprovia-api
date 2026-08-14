# Sequência de testes — AprovAI API

Ordem de dependência: cada grupo usa IDs gerados pelo anterior. Prefixo `/api` em todas as rotas.

---

## 1. Autenticação
Cria e autentica os usuários que todo o resto do roteiro vai usar.

- `POST /auth/register`
- `GET /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- `POST /auth/confirm-password-change`
- `POST /auth/logout`

## 2. Empresa e onboarding
Cria a empresa, mede o progresso do setup inicial e libera o restante do sistema.

- `POST /companies`
- `GET /companies/me`
- `PATCH /companies/me`
- `PATCH /companies/me/policy`
- `GET /onboarding`
- `GET /onboarding/cnpj/{cnpj}`
- `PATCH /onboarding/step`
- `POST /onboarding/complete`

## 3. Plano e assinatura
Confirma que a empresa nasceu com plano ativo — pré-requisito para operar.

- `GET /billing/subscription`
- `GET /billing/plans`

## 4. Equipe e convites
Traz os demais perfis (aprovador, solicitantes) para dentro da empresa.

- `POST /invites`
- `GET /invites`
- `GET /invites/token/{token}`
- `POST /invites/token/{token}/accept`
- `POST /invites/{id}/resend`
- `DELETE /invites/{id}`
- `GET /members`
- `GET /members/{id}`
- `PATCH /members/{id}/role`
- `PATCH /members/{id}/limit`
- `PATCH /members/{id}/manager`
- `PATCH /members/me/substitute`
- `GET /members/{id}/responsibilities`
- `DELETE /members/{id}`

## 5. Centros de Custo
Define os "bolsos" de onde os pedidos vão consumir orçamento.

- `POST /cost-centers`
- `GET /cost-centers`
- `GET /cost-centers/{id}`
- `PATCH /cost-centers/{id}`
- `GET /cost-centers/{id}/members`
- `POST /cost-centers/{id}/members`
- `DELETE /cost-centers/{id}/members/{memberId}`
- `POST /cost-centers/transfer-management`
- `PATCH /cost-centers/{id}/disable`
- `DELETE /cost-centers/{id}`

## 6. Matriz de alçadas
Define quem aprova até quanto — sem isso nenhum pedido tem para onde ser roteado.

- `GET /approval-rules`
- `PUT /approval-rules`
- `GET /approval-rules/resolve`
- `POST /approval-rules/simulate`
- `DELETE /approval-rules`

## 7. Categorias e fornecedores
Cadastro de apoio que os itens do pedido vão referenciar.

- `GET /categories`
- `POST /categories`
- `GET /categories/{id}`
- `PATCH /categories/{id}`
- `PATCH /categories/{id}/active`
- `GET /suppliers/lookup/{cnpj}`
- `POST /suppliers`
- `GET /suppliers`
- `GET /suppliers/{id}`
- `PATCH /suppliers/{id}`
- `PATCH /suppliers/{id}/blocked`
- `POST /suppliers/{id}/revalidate`

## 8. Orçamento
Define o valor disponível por Centro de Custo e período — sem isso todo pedido cai em exceção.

- `POST /cost-centers/{costCenterId}/budgets`
- `GET /cost-centers/{costCenterId}/budgets`
- `GET /cost-centers/{costCenterId}/budgets/current`
- `GET /budgets/{id}`
- `PATCH /budgets/{id}`
- `GET /budgets/{id}/entries`

## 9. Ciclo do pedido
O fluxo central: criar, montar, submeter e decidir um pedido de compra.

- `POST /purchase-requests`
- `GET /purchase-requests`
- `GET /purchase-requests/{id}`
- `POST /purchase-requests/{id}/items`
- `GET /purchase-requests/{id}/items`
- `PATCH /purchase-requests/{id}/items/{itemId}`
- `DELETE /purchase-requests/{id}/items/{itemId}`
- `POST /purchase-requests/{id}/files`
- `GET /purchase-requests/{id}/files`
- `GET /purchase-requests/{id}/files/{fileId}/download`
- `DELETE /purchase-requests/{id}/files/{fileId}`
- `POST /purchase-requests/{id}/extract`
- `GET /purchase-requests/{id}/extract`
- `PATCH /purchase-requests/{id}`
- `POST /purchase-requests/{id}/submit`
- `GET /purchase-requests/{id}/timeline`
- `POST /purchase-requests/{id}/decisions`
- `POST /purchase-requests/{id}/reassign`
- `POST /purchase-requests/{id}/duplicate`
- `POST /purchase-requests/{id}/cancel`
- `DELETE /purchase-requests/{id}`

## 10. Aprovação por e-mail
Caminho alternativo de decisão, fora da plataforma, sobre um pedido já criado na fase anterior.

- `GET /email-approvals/{token}`
- `POST /email-approvals/{token}`

## 11. Ordens de compra
A partir de um pedido aprovado, formaliza a compra com o fornecedor.

- `POST /purchase-requests/{id}/purchase-order`
- `GET /purchase-orders`
- `GET /purchase-orders/{id}`
- `GET /purchase-orders/{id}/balance`
- `POST /purchase-orders/{id}/send`
- `POST /purchase-orders/{id}/cancel`

## 12. Recebimentos
Registra o que efetivamente chegou contra a ordem de compra emitida.

- `POST /purchase-orders/{id}/receipts`
- `GET /purchase-orders/{id}/receipts`
- `GET /receipts/{id}`

## 13. Notas fiscais
Sobe e organiza o XML da NFe vinculado à ordem de compra.

- `POST /purchase-orders/{id}/invoices/upload`
- `POST /invoices/upload`
- `GET /purchase-orders/{id}/invoices`
- `GET /invoices/{id}`
- `POST /invoices/{id}/link`
- `POST /invoices/{id}/reject`

## 14. Conferência e pagamento
Cruza pedido, recebimento e nota; libera ou trava o pagamento.

- `POST /invoices/{id}/match`
- `GET /match-results`
- `GET /match-results/{id}`
- `POST /match-results/{id}/override`
- `GET /payables`
- `POST /payables/release-without-invoice`
- `POST /payables/{id}/pay`

## 15. Notificações
Confirma que as ações das fases anteriores geraram avisos corretos para cada pessoa.

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/{id}/read`
- `PATCH /notifications/read-all`
- `GET /notifications/preferences`
- `PATCH /notifications/preferences`

## 16. Auditoria
Confere que tudo que aconteceu acima deixou rastro.

- `GET /audit-logs`

## 17. Métricas e exportação
Visão consolidada de tudo que foi criado nas fases anteriores.

- `GET /analytics/dashboard`
- `GET /analytics/exports/requests`

## 18. Usuário e conta
Perfil próprio, independente de qual empresa está ativa.

- `GET /users/me`
- `PATCH /users/me`
- `GET /users`
- `GET /users/{id}`
- `DELETE /users/me`

## 19. Plataforma (SuperAdmin)
Fora do escopo de uma empresa: administra todas as empresas clientes.

- `GET /platform/organizations`
- `GET /platform/plans`
- `POST /platform/organizations/{companyId}/plan`
- `POST /platform/organizations/{companyId}/feature-overrides`
