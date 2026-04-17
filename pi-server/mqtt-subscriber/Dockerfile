FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/datacenter/

ENV PYTHONPATH=/app/datacenter
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "/app/datacenter/main.py"]
CMD ["--config", "/app/config.ini"]
