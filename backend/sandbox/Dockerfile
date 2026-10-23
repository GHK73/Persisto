FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ gcc openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 runner \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin runner

COPY executor.py /opt/runner/executor.py

USER 10001:10001
WORKDIR /tmp
ENTRYPOINT ["python3", "-I", "/opt/runner/executor.py"]
