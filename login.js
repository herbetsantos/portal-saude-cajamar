<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
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
