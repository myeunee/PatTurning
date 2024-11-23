# Python 3.9을 베이스 이미지로 사용
FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 필요한 파일 복사
COPY requirements.txt requirements.txt
COPY homeplus_mq.py app.py

# 패키지 설치
RUN pip install -r requirements.txt

EXPOSE 8080

# Flask 앱 실행
CMD ["python", "app.py"]