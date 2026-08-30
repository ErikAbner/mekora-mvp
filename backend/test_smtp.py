import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
KINDLE_EMAIL = os.getenv("KINDLE_EMAIL")

missing = [k for k, v in {
    "SMTP_HOST": SMTP_HOST,
    "SMTP_PORT": SMTP_PORT,
    "SMTP_USER": SMTP_USER,
    "SMTP_PASS": SMTP_PASS,
    "KINDLE_EMAIL": KINDLE_EMAIL,
}.items() if not v]

if missing:
    raise ValueError(f"Variáveis ausentes no .env: {', '.join(missing)}")

msg = EmailMessage()
msg["Subject"] = "Teste Kindle"
msg["From"] = SMTP_USER
msg["To"] = KINDLE_EMAIL
msg.set_content("Teste de envio automático para o Kindle físico.")

try:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
    print("Email enviado com sucesso.")
except Exception as e:
    print(f"Erro ao enviar email: {e}")

