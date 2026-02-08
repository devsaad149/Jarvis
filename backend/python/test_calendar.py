
from app.services.calendar_service import calendar_service

print("Testing Calendar Service...")
try:
    events = calendar_service.list_events()
    print("Result:")
    print(events)
except Exception as e:
    with open("error.log", "w") as f:
        f.write(f"Exception: {repr(e)}\nFull Error: {str(e)}")
    print(f"Exception logged to error.log")
