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
user_home = os.getenv('USER_HOME')
platform = "PLATFORM"

# DAG 기본 설정
default_args = {
    "owner": f"{owner}",                 # DAG 소유자
    "depends_on_past": False,            # 이전 실행 성공 여부에 의존하지 않음
    "retries": 1,                        # 태스크 실패 시 재시도 횟수
    "retry_delay": timedelta(minutes=5), # 재시도 간격
}

# DAG 정의
with DAG(
    dag_id=f"{dag_id}",                # DAG ID 
    default_args=default_args,         # 기본 인자
    description=f"{description}",      # DAG 설명
    # schedule_interval은 최대 6시간 이내로 설정되어야 합니다.
    schedule_interval="0 * * * *",
    start_date=datetime(yyyy, mm, dd), # 시작 날짜
    catchup=False,                     # 이전 날짜의 실행을 생략
) as dag:

    """ 특정 사이트를 크롤링하는 container job에 POST 요청 전송 Task
    Contributors는 producer를 임의대로 개발하고 Airflow Operator와 연결할 수 있습니다.
    """
    @task
    def send_post_request_task(category_id: int):
        return send_post_request('HP', category_id)

    # TaskFlow API를 사용해 Queue 값을 생ㅅ어하는 Task 정의
    @task
    def generate_queue_values():
        """ 사용하고자 하는 consumer 개수만큼 params을 지정합니다.
            default: 1 """
        return [
            {"consumer": f"{queue_name}"}
        ]

    # Consumer 실행
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task",
        bash_command=f"python3 {user_home}/{platform}_consumer.py " + "{{ params.consumer }}",
    ).expand(params=generate_queue_values())

    """ 카테고리가 여러 개라면 아래에 해당하는 카테고리 값들을 삽입합니다. """
    # category_ids = list(range(100001, 100078))


    """ 태스크 결과를 수집
        Contributors는 사용자 정의 이메일 전송 함수를 생성하고 실행할 수 있습니다."""
    collect_task_results_task = PythonOperator(
        task_id="collect_task_results",
        python_callable=collect_task_results,
        provide_context=True, # context 제공
        trigger_rule="all_done", # producer & consumer 태스크가 완료된 후 실행되어야 함
    )

    # 태스크 결과를 이메일로 전송
    send_summary_email = EmailOperator(
        task_id="send_summary_email",
        to=f"{email}",
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",
        trigger_rule="all_done", # producer & consumer & task 결과 수집 태스크가 완료된 후 실행되어야 함
    )

    """ Task Flow
        사용자 정의 DAG는 schedule_interval 간격 이내에 안정적으로 종료되어야 합니다. 
        producer와 consumer는 기본적으로 병렬로 처리됩니다.
        Contributors는 임의대로 task flow를 정의할 수 있습니다."""
    [
        run_consumer_task, # Consumer
        send_post_request_task, # Producer
    ] >> collect_task_results_task >> send_summary_email # Task 결과 수집 후 이메일 전송


