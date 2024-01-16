import mysql.connector
from config import DB_CONFIG

def show_open_connections():
    try:
        with mysql.connector.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SHOW PROCESSLIST")
                for row in cursor.fetchall():
                    print(row)  # Each row represents a connection
    except mysql.connector.Error as e:
        print(f"Error: {e}")

show_open_connections()

def close_connection_by_process_id(process_id):
    try:
        with mysql.connector.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"KILL {process_id}")
                print(f"Closed connection with process ID: {process_id}")
    except mysql.connector.Error as e:
        print(f"Error: {e}")

# close_connection_by_process_id(3330)

