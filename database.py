import mysql.connector
from config import DB_CONFIG
import numpy as np
import matlab.engine


class MatlabDataLoader:

    def get_data(self,eng,group):
        wavelet = np.array(eng.eval(f'wavelet.{group}'))
        LFP = np.array(eng.eval(f'LFP.{group}'))
        return wavelet.astype(np.int32) , LFP.astype(np.int32)


class Database:

    def create_databaseTables(self):

        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS my_new_database")
        cursor.execute("USE my_new_database")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()

        for table in tables:
            cursor.execute(f"DROP TABLE {table[0]}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session INT AUTO_INCREMENT PRIMARY KEY,     
                subject VARCHAR(20),
                category VARCHAR(50),
                stimulus_group VARCHAR(50)
            )
        """)


        cursor.execute("""
            CREATE TABLE IF NOT EXISTS arrays (
                entry INT AUTO_INCREMENT PRIMARY KEY,
                session INT,
                channel INT,
                trial INT,
                LFP_data BLOB,
                wavelet_data BLOB,
                FOREIGN KEY (session) REFERENCES sessions(session)
            )
        """)
         
        conn.commit()
        cursor.close()
        conn.close()

    def insert_subject(self, group,subject,stimGroup):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        cursor.execute("INSERT INTO sessions (subject,category,stimulus_group) VALUES (%s,%s,%s)", (subject,group,stimGroup))

        session = cursor.lastrowid 

        conn.commit()
        cursor.close()
        conn.close()

        return session

    def insert_subjectData(self, data_list):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        insert_query = """
            INSERT INTO arrays (session, channel, trial, LFP_data, wavelet_data) 
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_query, data_list)
        
        conn.commit()
        cursor.close()
        conn.close()

    def count_rows(self, table_name):

        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        query = f"SELECT COUNT(*) FROM {table_name}"
        cursor.execute(query)

        row_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return row_count

if __name__ == "__main__":
    
    eng = matlab.engine.connect_matlab('primary')
    groupLabels = eng.eval('groupLabels')
    # stimGroup = eng.eval('stimGroup')
    # subject = eng.eval('subject')

    dataLoader = MatlabDataLoader()

    db = Database()
    db.create_databaseTables()
    
    for group in groupLabels:
        session = db.insert_subject(group, subject='YDX', stimGroup='Target Stimulus')
        wavelet, LFP = dataLoader.get_data(eng, group)
        print(group)
        for channel in range(wavelet.shape[-1]):
            data_list = []
            print(channel)
            for trial in range(wavelet.shape[-2]):
                LFP_data = LFP[:, trial, channel].tobytes()
                wavelet_data = wavelet[:, :, trial, channel].tobytes()
                data_list.append((session, channel, trial, LFP_data, wavelet_data))
            
            db.insert_subjectData(data_list)

    arrays_row_count = db.count_rows("arrays")
    print(f"Number of rows in 'arrays' table: {arrays_row_count}")