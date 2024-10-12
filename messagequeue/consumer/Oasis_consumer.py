import pika, threading, sys
import os, time, json
from dotenv import load_dotenv
import datetime, logging
cnt = 0 # 메시지 수신 카운터

# 로깅 설정
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

load_dotenv()
mount_home = os.getenv('MOUNT_HOME')
username = os.getenv("RABBITMQ_USERNAME")
password = os.getenv("RABBITMQ_PASSWORD")
hostname = os.getenv("RABBITMQ_HOSTNAME")
port = os.getenv("RABBITMQ_PORT")
vhost = os.getenv("RABBITMQ_VHOST")
queue = sys.argv[1] # 실행 시 인자로 전달되는 큐 이름

# 연결이 끊어졌을 경우를 대비하여 계속해서 재시도
while True:
    try:
        # RabbitMQ 연결 파라미터 설정
        params = pika.ConnectionParameters(
            hostname,
            port,
            vhost,
            pika.PlainCredentials(username, password), # 인증 정보 설정
            blocked_connection_timeout=300  # 5분 동안 연결이 차단된 경우 연결 유지
        )

        # RabbitMQ 연결 & 채널 생성
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.basic_qos(prefetch_count=10) # 동시에 처리할 수 있는 최대 메시지 수
        
        break
    # 연결 오류 발생시 재시도
    except pika.exceptions.AMQPConnectionError as e:
        logging.info(f"Connection error: {e}, retrying in 5 seconds...")
        time.sleep(5)


# 타임아웃 시간 설정: 메시지를 받지 못한 지 3분이 소요되면 타임아웃
TIMEOUT_SECONDS = 180

# 타임아웃 시 실행되는 handler
def timeout_handler():
    print("Timeout reached, no messages received. Shutting down.")
    logging.info(f"One of Three Consumers Exited(0). This Consumer consumed **{cnt}** messages")
    connection.close()  # Connection을 닫아서 종료
    sys.exit(0)  # 프로그램 종료


# 타이머 초기화
def reset_timer():
    global timer
    if timer:
        timer.cancel()  # 기존 타이머 취소
    # 새로운 타이머 설정 및 시작
    timer = threading.Timer(TIMEOUT_SECONDS, timeout_handler)
    timer.start()

# KST 설정
start = time.time()
KST = datetime.timezone(datetime.timedelta(hours=9))
now_hour = str(datetime.datetime.now(KST))[11:13]
current_date = str(datetime.datetime.now(KST))[:10]

timer = None

# 메시지 수신 시 호출되는 callback function
def callback(ch, method, properties, body):
    global cnt
    global start
    cnt += 1 # 메시지 카운트

    try:
        # 수신한 메시지 JSON으로 변환
        message_str = body.decode("utf-8")
        message_json = json.loads(message_str)
    # JSON 디코딩 오류가 발생한 경우 해당 메시지를 무시
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON: {e}\n Received message: {message_str}")
        pass
    product_id = message_json["product_id"]
    price = message_json["price"]

    # 수신한 데이터를 파일로 저장
    with open(f"{mount_home}/Oasis/{product_id}.txt", "a") as f:
        f.write(f"{current_date},{now_hour}:00,{price}\n")
    
    if cnt % 10000 == 0:
        end = time.time()
        time_spent = datetime.timedelta(seconds=(end - start))
        logging.info(f"Saving Product Per 10000s spent {time_spent}")
        start = time.time()
    # 약 30~40초마다 타이머 리셋
    if cnt % 2200 == 0:
        reset_timer() 


# RabbitMQ 큐 연결 & 메시지 수신
channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)


logging.info("Waiting for messages. To exit press CTRL+C") # 메시지 수신 대기 로그
reset_timer() # 타이머 초기화
channel.start_consuming() # 메시지 수신 시작
