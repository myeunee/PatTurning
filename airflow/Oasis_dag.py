from requirements.modules import collect_task_results, send_post_request
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from airflow import DAG
from airflow.decorators import task

# DAG의 기본 설정
default_args = {
    "owner": "khuda",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# DAG 정의
with DAG(
    dag_id="Oasis_Crawling_DAG",  # DAG의 이름
    default_args=default_args,  # 기본 인자 설정
    description="Oasis Crawling",  # DAG 설명
    schedule_interval="0 * * * *",
    start_date=datetime(2024, 9, 20),  # 시작 날짜
    catchup=False,  # 시작 날짜부터 현재까지의 미실행 작업 실행 여부
) as dag:

    @task
    def send_post_request_OASIS_task():
        return send_post_request()

    # TaskFlow API로 task 정의
    @task
    def generate_queue_values():
        return [{"consumer": "Oasis.product.queue"}]

    # BashOperator에서 expand로 받은 값을 사용
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task",
        bash_command="python3 /home/patturning2/Oasis_consumer.py {{ params.consumer }}",  # 템플릿을 사용하여 매핑된 값 사용
    ).expand(params=generate_queue_values())

    # 모든 태스크가 완료된 후 상태를 수집
    collect_task_results_task = PythonOperator(
        task_id="collect_task_results",
        python_callable=collect_task_results,
        provide_context=True,
        trigger_rule="all_done",
    )

    # 이메일 전송
    send_summary_email = EmailOperator(
        task_id="send_summary_email",
        to="patturning2@gmail.com",
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",
        trigger_rule="all_done",
    )
    [
        send_post_request_OASIS_task()
        run_consumer_task
    ] >> collect_task_results_task >> send_summary_email
