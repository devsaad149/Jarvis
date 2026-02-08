from datetime import datetime

def get_time_of_day():
    hour = datetime.now().hour
    if hour < 12:
        return "morning"
    elif hour < 17:
        return "afternoon"
    elif hour < 21:
        return "evening"
    else:
        return "night"

def format_iso_time(dt=None):
    if dt is None:
        dt = datetime.now()
    return dt.isoformat()
