from airflow import DAG
from airflow.decorators import task
from dotenv import load_dotenv
import os
from airflow.operators.bash import BashOperator
from airflow.exceptions import AirflowSkipException
from airflow.operators.python import get_current_context
from datetime import datetime, timedelta
import json, requests

# 함수 정의: HTTP POST 요청
def send_post_request(categoryId):
    load_dotenv()
    url = os.getenv("SERVICE_URL")
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"category_id": categoryId})

    response = requests.post(url, headers=headers, data=data)

    # 응답 코드와 내용을 로그로 남김
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()
        print(f"Failed: {response.status_code}, NO PRODUCT EXISTS, detail shows below\n{response.text}")
        raise AirflowSkipException(f"Skip task {context['ti'].task_id}")
    else:
        print(f"Failed: {response.status_code}, {response.text}")
        response.raise_for_status()

# DAG의 기본 설정
default_args = {
    'owner': 'khuda',                  # DAG 소유자
    'depends_on_past': False,          # 이전 DAG 실패 여부에 의존하지 않음
    'email_on_failure': False,         # 실패 시 이메일 보내기 여부
    'email_on_retry': False,           # 재시도 시 이메일 보내기 여부
    'retries': 1,                      # 실패 시 재시도 횟수
    'retry_delay': timedelta(minutes=5) # 재시도 간격
}

# DAG 정의
with DAG(
    'HomePlus_Crawling_DAG',             # DAG의 이름
    default_args=default_args,           # 기본 인자 설정
    description='HomePlus Crawling',     # DAG 설명
    schedule_interval=timedelta(days=1), # 실행 주기 (매일 1회)
    start_date=datetime(2024, 9, 18),    # 시작 날짜
    catchup=False                        # 시작 날짜부터 현재까지의 미실행 작업 실행 여부
) as dag:
    
    run_consumer_task = BashOperator(
        task_id='run_consumer',       # Task 이름
        bash_command="python3 /home/patturning1/mq_consumer.py &",
        do_xcom_push=False
    )    


    @task
    def send_post_request_HOMEPLUS_task(category_id):
        return send_post_request(category_id)    
   
    category_ids = list(range(100001, 100078))

    [run_consumer_task, send_post_request_HOMEPLUS_task.expand(category_id=category_ids)]



