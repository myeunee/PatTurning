import pika, threading, sys
import os, time, json
from dotenv import load_dotenv
import datetime, logging

# 메시지 수신 횟수를 기록하기 위한 전역 변수
cnt = 0

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# 플랫폼 이름 설정 : 여기에 가격 정보를 수집하려는 사이트의 플랫폼 명을 입력해 주세요.
platform = "PLATFORM_NAME"

load_dotenv()
username = os.getenv('RABBITMQ_USERNAME', 'guest')  # RabbitMQ 사용자 이름 (기본값: guest)
password = os.getenv('RABBITMQ_PASSWORD', 'guest'   )  # RabbitMQ 비밀번호 (기본값: guest)
hostname = os.getenv('RABBITMQ_HOSTNAME', 'localhost')  # RabbitMQ 호스트 이름 (기본값: localhost)
port = os.getenv('RABBITMQ_PORT', '5672')          # RabbitMQ 포트 (기본값: 5672)
vhost = os.getenv('RABBITMQ_VHOST', '/')        # RabbitMQ 가상 호스트 (기본값: /)
mount_home = os.getenv('MOUNT_HOME', 'output')       # 파일 저장 경로 (기본값: output)

# mount_home 디렉토리가 존재하지 않은 경우 생성
if not os.path.exists(mount_home):
    os.makedirs(mount_home)
    logging.info(f"Directory {mount_home} created")

# 큐 이름을 명령행 인자로부터 가져옴
queue = sys.argv[1]

while True:
    try:
        # RabbitMQ 연결 매개변수 설정
        params = pika.ConnectionParameters(
            hostname,
            port,
            vhost,
            pika.PlainCredentials(username, password),
            heartbeat=600,  # Heartbeat를 10분으로 설정
            blocked_connection_timeout=300  # 5분 동안 연결 유지
        )

        # RabbitMQ 연결 생성
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        break
    except pika.exceptions.AMQPConnectionError as e:
        print(f"Connection error: {e}, retrying in 5 seconds...")
        time.sleep(5)

# 타임아웃 시간 설정 (초 단위)
TIMEOUT_SECONDS = 180

# 타임아웃 핸들러 함수
def timeout_handler():
    """
    타임아웃이 발생했을 때 호출되는 함수.
    메시지를 일정 시간 동안 받지 못하면 연결을 닫고 프로그램을 종료함.
    """
    print("Timeout reached, no messages received. Shutting down.")
    connection.close()  # Connection을 닫아서 종료
    sys.exit(0)  # 프로그램 종료

# 타이머를 설정하는 함수
def reset_timer():
    """
    타이머를 초기화하고 시작하는 함수.
    기존 타이머가 있으면 취소하고 새로운 타이머를 시작함.
    """
    global timer
    if timer:
        timer.cancel()  # 기존 타이머를 취소
    timer = threading.Timer(TIMEOUT_SECONDS, timeout_handler)
    timer.start()

# 현재 시간과 날짜를 설정
start = time.time()
KST = datetime.timezone(datetime.timedelta(hours=9))
now_hour = str(datetime.datetime.now(KST))[11:13]
current_date = str(datetime.datetime.now(KST))[:10]

# 타이머 초기화
timer = None

# 메시지 수신 시 호출되는 콜백 함수
def callback(ch, method, properties, body):
    """
    메시지를 수신했을 때 호출되는 함수.
    메시지를 디코딩하고 JSON으로 변환한 후, 특정 경로에 파일로 저장함.
    
    Args:
        ch: 채널
        method: 전달 메소드
        properties: 메시지 속성
        body: 메시지 본문 (바이트 형태)
    """
    global cnt
    global start
    cnt += 1
    reset_timer()
    try:
        message_str = body.decode('utf-8')  # 메시지를 UTF-8로 디코딩
        message_json = json.loads(message_str)  # JSON으로 변환
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON: {e}\n Received message: {message_str}")
        pass

    # 메시지에서 필요한 정보 추출
    category_name = message_json['category_name']
    product_id = message_json['product_id']
    price = message_json['price']

    # 카테고리 이름이 있는 경우 해당 디렉토리에 파일 저장
    if category_name:
        if not os.path.exists(f"{mount_home}/{platform}/{category_name}"):
            os.makedirs(f"{mount_home}/{platform}/{category_name}/")
            logging.info(f"Directory {mount_home}/{platform}/{category_name}/ created")
            with open(f'{mount_home}/{platform}/{category_name}/{product_id}.txt', 'a') as f:
                f.write(f"{current_date},{now_hour}:00,{price}\n")
    else:
        # 카테고리 이름이 없는 경우 기본 경로에 파일 저장
        with open(f"{mount_home}/{platform}/{product_id}.txt", "a") as f:
            f.write(f"{current_date},{now_hour}:00,{price}\n")
    
    # 10000번째 메시지마다 로그 기록
    if cnt % 10000 == 0:
        end = time.time()
        time_spent = datetime.timedelta(seconds=(end-start))
        logging.info(f"Saving Product Per 10000s spent {time_spent}")
        start = time.time()

# 메시지를 수신하도록 큐에 연결
channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)

# 메시지 수신 대기
logging.info('Waiting for messages. To exit press CTRL+C')
reset_timer()
channel.start_consuming()