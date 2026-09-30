# Isoko Coffee House API

Railway environment variables:
- MYSQL_PRIVATE_URL = Railway reference to the MySQL service variable
- JWT_SECRET = a long random secret
- PUBLIC_API_URL = the public Railway API URL

Run server/schema.sql against the MySQL database once, then deploy the server directory as a Railway service.