from airflow import DAG
from airflow.decorators import task
from dotenv import load_dotenv
import os
from airflow.operators.bash import BashOperator
from airflow.exceptions import AirflowSkipException
from airflow.operators.python import get_current_context
from airflow.operators.email import EmailOperator
from airflow.operators.empty import EmptyOperator
from datetime import datetime, timedelta
import json, requests


# 함수 정의: HTTP POST 요청
def send_post_request(categoryId):
    load_dotenv()
    url = os.getenv("HOMEPLUS_SERVICE_URL")
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"category_id": categoryId})

    response = requests.post(url, headers=headers, data=data)

    # 응답 코드와 내용을 로그로 남김
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()
        print(
            f"Failed: {response.status_code}, NO PRODUCT EXISTS, detail shows below\n{response.text}"
        )
        raise AirflowSkipException(f"Skip task {context['ti'].task_id}")
    else:
        print(f"Failed: {response.status_code}, {response.text}")
        response.raise_for_status()
        


# DAG의 기본 설정
default_args = {
    "owner": "khuda",  # DAG 소유자
    "depends_on_past": False,  # 이전 DAG 실패 여부에 의존하지 않음
    # 'email': ['dbgpwl34@gmail.com'],    # 수신자 이메일
    #    "email_on_success": True,           # 성공 시 이메일 전송
    # 'email_on_failure': True,           # 실패 시 이메일 전송
    # 'email_on_retry': True,             # 재시도 시 이메일 전송
    "retries": 1,  # 실패 시 재시도 횟수
    "retry_delay": timedelta(minutes=5),  # 재시도 간격
}

# DAG 정의
with DAG(
    "HomePlus_Crawling_DAG",  # DAG의 이름
    default_args=default_args,  # 기본 인자 설정
    description="HomePlus Crawling",  # DAG 설명
    # schedule_interval='0 9,16,22 * * *',       # 실행 주기 (매일 09:00, 16:00, 22:00 정각)
    schedule_interval="0 * * * *",
    start_date=datetime(2024, 9, 20),  # 시작 날짜
    catchup=False,  # 시작 날짜부터 현재까지의 미실행 작업 실행 여부
) as dag:


    @task
    def send_post_request_HOMEPLUS_task(category_id):
        return send_post_request(category_id)

    # TaskFlow API로 task 정의
    @task
    def generate_queue_values():
        return [
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
        ]

    # BashOperator에서 expand로 받은 값을 사용
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task",
        bash_command="python3 /home/patturning1/HomePlus_consumer.py {{ params.consumer }}",  # 템플릿을 사용하여 매핑된 값 사용
    ).expand(params=generate_queue_values())

    category_ids = list(range(100001, 100078))

    # 모든 병렬 태스크가 완료된 후의 마무리 태스크
    final_task = EmptyOperator(
        task_id='empty-task',
        dag=dag
    )

    # 실패 시 이메일 전송
    send_failure_email = EmailOperator(
        task_id='send_failure_email',
        to='patturning@gmail.com',
        subject='Task Failure Alert',
        html_content="""
        <h3>One or more tasks have failed!</h3>
        <p>Please check the Airflow logs for more details.</p>
        """,
        trigger_rule='one_failed',  # 이전 태스크 중 하나라도 실패하면 이메일 전송
        dag=dag
    )

    # 성공 여부와 상관없이 모두 완료된 후의 마지막 성공 태스크
    send_success_email = EmailOperator(
        task_id='send_success_email',
        to='patturning@gmail.com',
        subject='Task Success Alert',
        html_content="""
        <h3>All dynamic tasks have completed successfully.</h3>
        """,
        trigger_rule='all_success',  # 모든 태스크가 성공해야만 실행
        dag=dag
    )

    [
        run_consumer_task,
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),
    ] >> [send_failure_email, send_success_email]
