-- ====================================================
-- VER TODOS OS DOCUMENTOS NO BANCO
-- ====================================================

SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as cliente_nome,
  c.email as cliente_email,
  d.upload_date,
  CASE 
    WHEN d.client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid 
    THEN '✅ Pertence ao cliente correto'
    ELSE '❌ Pertence a outro cliente'
  END as status
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC
LIMIT 20;

