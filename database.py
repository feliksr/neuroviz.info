import json
import mysql.connector
from config import DB_CONFIG
import numpy as np
import matlab.engine

createNewDatabase=False

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
                stimulus_group VARCHAR(50),
                timeStart INT,
                timeStop INT,
                freqScale JSON, 
                xBinsWavelet INT,
                yBinsWavelet INT                
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

    def insert_subject(self, category,subject,stimGroup,lenTime,freqScale,waveletShape):

        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")
        
        cursor.execute("SELECT session FROM sessions WHERE subject = %s AND category = %s AND stimulus_group = %s",
                   (subject, category, stimGroup))
        result = cursor.fetchone()

        if result:
            session = result[0]
        else:
            cursor.execute("INSERT INTO sessions (subject, category, stimulus_group, timeStart, timeStop, freqScale, xBinsWavelet, yBinsWavelet) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                        (subject, category, stimGroup, lenTime[0][0].tolist(), lenTime[0][1].tolist(), freqScale, waveletShape[0], waveletShape[1]))
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
    stimGroup = eng.eval('stimGroup')
    subject = eng.eval('subject')
    frequencyScale = np.array(eng.eval('freqScale'))
    freqScale = json.dumps(frequencyScale.tolist())
    lenTime = np.array(eng.eval('lenTime')).astype(np.int32)
    
    dataLoader = MatlabDataLoader()

    db = Database()
    if (createNewDatabase == True):
        db.create_databaseTables()
    
    for category in groupLabels:
        wavelet, LFP = dataLoader.get_data(eng, category)
        session = db.insert_subject(category,subject,stimGroup,lenTime,freqScale,[wavelet.shape[0],wavelet.shape[1]])
        print(category)
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        delete_query = "DELETE FROM arrays WHERE session = %s"
        cursor.execute(delete_query, (session,))
        conn.commit()

        cursor.close()
        conn.close()
        for channel in range(wavelet.shape[-1]):
            data_list = []
            print(channel)
            for trial in range(wavelet.shape[-2]):
                LFP_data = LFP[:, trial, channel].tobytes()
                wavelet_data = wavelet[:, :, trial, channel].tobytes()
                data_list.append((session, channel+1, trial+1, LFP_data, wavelet_data))
            
            db.insert_subjectData(data_list)

    arrays_row_count = db.count_rows("arrays")
    print(f"Number of rows in 'arrays' table: {arrays_row_count}")