from requirements.modules import collect_task_results, send_post_request
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from airflow import DAG
from airflow.decorators import task
from dotenv import load_dotenv
import os

load_dotenv()
user_home=os.getenv('USER_HOME')

# DAG 기본 설정
default_args = {
    "owner": "khuda",                     # DAG 소유자
    "depends_on_past": False,             # 이전 실행 성공 여부에 의존하지 않음
    "retries": 1,                         # 태스크 실패 시 재시도 횟수: 1
    "retry_delay": timedelta(minutes=5),  # 재시도 간격: 5분 후 1회만 재시도
}

# DAG 정의
with DAG(
    dag_id="HomePlus_Crawling_DAG",   # DAG ID
    default_args=default_args,        # 기본 인자
    description="HomePlus Crawling",  # DAG 설명
    schedule_interval="0 * * * *",    # 1시간 간격 실행
    start_date=datetime(2024, 9, 20), # 시작 날짜
    catchup=False,                    # 이전 날짜의 실행을 생략
) as dag:

    # HomePlus를 크롤링하는 container job에 POST 요청 전송 task
    # Producer 실행
    @task
    def send_post_request_HOMEPLUS_task(category_id):
        return send_post_request('HP', category_id)

    # TaskFlow API를 사용해 Queue 값을 생성하는 Task 정의
    @task
    def generate_queue_values():
        return [
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
        ]

    # Consumer 실행
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task", 
        bash_command=f"python3 {user_home}/HomePlus_consumer.py " +  "{{ params.consumer }}", 
    ).expand(params=generate_queue_values())

    category_ids = list(range(100001, 100078))

    # 태스크 결과를 수집
    collect_task_results_task = PythonOperator(
        task_id="collect_task_results", 
        python_callable=collect_task_results, 
        provide_context=True,     # 컨텍스트 제공
        trigger_rule="all_done",  # producer & consumer 태스크가 완료된 후 실행되어야 함
    )

    # 태스크 결과를 이메일로 전송
    send_summary_email = EmailOperator(
        task_id="send_summary_email",  
        to="patturning2@gmail.com", 
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",    # 이메일 제목
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",  # 이메일 내용
        trigger_rule="all_done",  # producer & consumer & task결과 수집 태스크가 완료된 후 실행되어야 함
    )

    # Task Flow
    [
        run_consumer_task,  # Consumer
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),  # Producer
    ] >> collect_task_results_task >> send_summary_email  # Task 결과 수집 후 이메일 전송
    
    
##### ##