import pika, threading, sys
import os, time, json
from dotenv import load_dotenv
import datetime, logging
cnt = 0

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')



load_dotenv()
username = os.getenv('RABBITMQ_USERNAME')
password = os.getenv('RABBITMQ_PASSWORD')
hostname = os.getenv('RABBITMQ_HOSTNAME')
port = os.getenv('RABBITMQ_PORT')
vhost = os.getenv('RABBITMQ_VHOST')
queue = sys.argv[1]

while True:
    try:
        # 사용자 이름과 비밀번호 설정
        credentials = pika.PlainCredentials(username, password)

        # RabbitMQ 연결 설정
        connection = pika.BlockingConnection(pika.ConnectionParameters(hostname, port, vhost, credentials))
        channel = connection.channel()
        channel.basic_qos(prefetch_count=30)
        break
    except pika.exceptions.AMQPConnectionError as e:
        print(f"Connection error: {e}, retrying in 5 seconds...")
        time.sleep(5)

# 타임아웃 시간 설정 
TIMEOUT_SECONDS = 180

def timeout_handler():
    print("Timeout reached, no messages received. Shutting down.")
    connection.close()  # Connection을 닫아서 종료
    sys.exit(0)  # 프로그램 종료

# 타이머를 설정하는 함수
def reset_timer():
    global timer
    if timer:
        timer.cancel()  # 기존 타이머를 취소
    timer = threading.Timer(TIMEOUT_SECONDS, timeout_handler)
    timer.start()

start = time.time()
current_date = datetime.datetime.now().strftime('%Y-%m-%d')
KST = datetime.timezone(datetime.timedelta(hours=9))
now_hour = str(datetime.datetime.now(KST))[11:13]

timer = None
# 콜백 함수 정의 (메시지 수신 시 호출됨)
def callback(ch, method, properties, body):
    global cnt
    global start
    cnt += 1
    reset_timer()
    # formatted_date = now.strftime("%Y-%m-%d %H:%M:%S")
    try:
        message_str = body.decode('utf-8')
        message_json = json.loads(message_str)
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON: {e}\n Received message: {message_str}")
        pass
    category_name = message_json['category_name']
    product_id = message_json['product_id']
    price = message_json['price']

    if not os.path.exists(f"/mnt/patturning/HomePlus/{category_name}"):
        os.makedirs(f"/mnt/patturning/HomePlus/{category_name}/")
        logging.info(f"Directory /mnt/patturning/HomePlus/{category_name}/ created")
    # else:
        # print(f"Directory ./homeplus/{category_name}/ already exists")
    with open(f'/mnt/patturning/HomePlus/{category_name}/{product_id}.txt', 'a') as f:
        f.write(f"{current_date},{now_hour}:00,{price}\n")
    if cnt % 10000 == 0:
        end = time.time()
        time_spent = datetime.timedelta(seconds=(end-start))
        logging.info(f"Saving Product Per 10000s spent {time_spent}")
        start = time.time()

# 메시지를 수신하도록 큐에 연결
channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)


logging.info('Waiting for messages. To exit press CTRL+C')
reset_timer()
channel.start_consuming()
<<<<<<< HEAD:messagequeue/consumer/homeplus_consumer.py
=======

##
##push test
>>>>>>> 2b60becefbf24813d0919321adb62cc9c2607c4a:messagequeue/consumer/HomePlus_consumer.py
