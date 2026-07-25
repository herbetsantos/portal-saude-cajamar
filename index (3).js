
Index · HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="B10lwzARXdaUTRUQrRj9bt878Htx8shXtDS1tbUJhlk" />
<title>Portal Saúde Cajamar</title>
</head>
<body>
<script>
  fetch('/api/me', { credentials: 'same-origin' })
    .then((r) => { window.location.replace(r.ok ? '/portal.html' : '/login.html'); })
    .catch(() => { window.location.replace('/login.html'); });
</script>
</body>
</html>
 
