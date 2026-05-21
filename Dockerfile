FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8080
ENV PERA_DATA_DIR=/app/data

COPY . /app

RUN mkdir -p /app/data/templates/scenes /app/data/history/records /app/data/history/images

EXPOSE 8080

CMD ["python", "server.py"]
