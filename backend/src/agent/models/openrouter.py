from langchain.chat_models import init_chat_model
from os import getenv

openrouterModel = init_chat_model(
    model="step-3.5-flash:free",
    model_provider="stepfun",
    base_url="https://openrouter.ai/api/v1",
    api_key=getenv("OPENROUTER_API_KEY"),
    default_headers={
    
    }
)