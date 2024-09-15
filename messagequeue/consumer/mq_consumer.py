import pika
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
queue = os.getenv('RABBITMQ_QUEUE')

# 사용자 이름과 비밀번호 설정
credentials = pika.PlainCredentials(username, password)

# RabbitMQ 연결 설정
connection = pika.BlockingConnection(pika.ConnectionParameters(hostname, port, vhost, credentials))
channel = connection.channel()

start = time.time()
current_date = datetime.datetime.now().strftime('%Y-%m-%d')
# 콜백 함수 정의 (메시지 수신 시 호출됨)
def callback(ch, method, properties, body):
    start = time.time()
    global cnt
    cnt += 1
    # now = datetime.datetime.now()
    # formatted_date = now.strftime("%Y-%m-%d %H:%M:%S")
    message_str = body.decode('utf-8')
    message_json = json.loads(message_str)
    category_name = message_json['category_name']
    product_id = message_json['product_id']
    price = message_json['price']

    if not os.path.exists(f"./homeplus/{category_name}"):
        os.makedirs(f"./homeplus/{category_name}/")
        logging.info(f"Directory ./homeplus/{category_name}/ created")
    # else:
        # print(f"Directory ./homeplus/{category_name}/ already exists")
    with open(f'./homeplus/{category_name}/{product_id}.txt', 'a') as f:
        f.write(f"{current_date},{price}\n")
    end = time.time()  
    time_spent = datetime.timedelta(seconds=(end-start))
    logging.info(f"{cnt}, ProductId[{product_id}] saving spent {time_spent}")

# 메시지를 수신하도록 큐에 연결
channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)


logging.info('Waiting for messages. To exit press CTRL+C')
channel.start_consuming()