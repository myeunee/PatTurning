from requirements.modules import collect_task_results, send_post_request
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from airflow import DAG
from airflow.decorators import task

# DAG 기본 설정
default_args = {
    "owner": f"{owner}",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# DAG 정의
with DAG(
    dag_id=f"{dag_id}",
    default_args=default_args,
    description=f"{description}",
    # schedule_interval은 최대 6시간 이내로 설정되어야 합니다.
    schedule_interval="0 * * * *",
    start_date=datetime(yyyy, mm, dd),
    catchup=False,
) as dag:

    @task
    def send_post_request_HOMEPLUS_task(category_id):
        return send_post_request('HP', category_id)

    # TaskFlow API로 task 정의
    @task
    def generate_queue_values():
        # 사용하고자 하는 consumer 개수만큼 params을 지정합니다.
        # default: 1
        return [
            {"consumer": f"{queue_name}"}
        ]

    # BashOperator에서 expand로 받은 값을 사용
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task",
        bash_command="python3 /home/patturning2/HomePlus_consumer.py {{ params.consumer }}",
    ).expand(params=generate_queue_values())

    # 카테고리가 여러 개라면 아래에 해당하는 카테고리 값들을 
    # category_ids = list(range(100001, 100078))


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
        run_consumer_task,
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),
    ] >> collect_task_results_task >> send_summary_email


