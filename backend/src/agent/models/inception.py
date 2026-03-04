import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

inceptionModel = ChatOpenAI(
    model="mercury-2",
    temperature=0.75,
    api_key=os.environ["INCEPTION_API_KEY"],
    base_url="https://api.inceptionlabs.ai/v1"
)
