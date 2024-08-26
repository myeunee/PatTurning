# 베이스 이미지로 Python 3.9 사용
FROM python:3.9-slim

#Rust, Cargo 설치
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . "$HOME/.cargo/env" \
    && export PATH="$HOME/.cargo/bin:$PATH"

# 작업 디렉토리 설정
WORKDIR /app

# 필요 파일 복사
COPY clf_model.h5 /app/
COPY tokenizer.pickle /app/
COPY app.py /app/

# 필요한 Python 패키지 설치
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN /bin/bash -c "source $HOME/.cargo/env && pip install --no-cache-dir -r requirements.txt"

RUN pip install gunicorn

# Flask 애플리케이션 실행
EXPOSE 5000
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000", "-w", "2","--timeout", "120"]
