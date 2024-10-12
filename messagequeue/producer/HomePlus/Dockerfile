# base image: Python 3.9
FROM python:3.9-slim

# configure working directory
WORKDIR /app

# python 의존성 패키지 파일 & 실행 파일 복사
COPY requirements.txt requirements.txt
COPY homeplus_mq.py app.py

# install packages
RUN pip install -r requirements.txt

# 컨테이너의 8080 포트를 외부에 노출
EXPOSE 8080

# Flask 앱 실행
CMD ["python", "app.py"]