from dotenv import load_dotenv
import os, json, requests
from airflow.operators.python import get_current_context
from airflow.exceptions import AirflowSkipException

# 모든 태스크의 상태를 수집하여 결과를 XCom에 저장하는 함수
def collect_task_results(**context):
    task_instances = context['dag_run'].get_task_instances()
    task_states = {task_instance.task_id: task_instance.state for task_instance in task_instances}

    platform='None'
    for k, y in task_states.items():
        if 'HOMEPLUS' in k:
            platform = 'HOMEPLUS'
        elif 'OASIS' in k:
            platform = 'OASIS'
            
    # 실패한 태스크가 있는지 확인
    if any(state == 'failed' for state in task_states.values()):
        email_subject = f"❗️ [{platform}] Task Failure Alert ❗️"
        email_body = f"""
        <h3>One or more tasks have failed!</h3>
        <p>Task States:</p>
        <pre>{task_states}</pre>
        """
    else:
        email_subject = f"[{platform}] Task Success Alert"
        email_body = f"""
        <h3>All tasks have completed successfully!</h3>
        <p>Task States:</p>
        <pre>{task_states}</pre>
        """

    # 결과를 XCom에 저장
    context['ti'].xcom_push(key='email_subject', value=email_subject)
    context['ti'].xcom_push(key='email_body', value=email_body)
    
# HTTP POST 요청 함수
def send_post_request(platform, categoryId=0):
    load_dotenv()
    url = ""
    if platform == 'HP':
        url = os.getenv("HOMEPLUS_SERVICE_URL")
        headers = {"Content-Type": "application/json"}
        data = json.dumps({"category_id": categoryId})
        response = requests.post(url, headers=headers, data=data)
    elif platform == 'OA':
        url = os.getenv("OASIS_SERVICE_URL")
        response = requests.post(url)

    if response.status_code == 200:
        print(f"Success: {response.json()}")
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()
        raise AirflowSkipException(f"Skip task {context['ti'].task_id}")
    else:
        response.raise_for_status()