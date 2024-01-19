import json
import mysql.connector
from config import DB_CONFIG
import numpy as np
import matlab.engine
import io

createNewDatabase=False

class MatlabDataLoader:

    def get_data(self,eng,group):
        wavelet = np.array(eng.eval(f'wavelet.{group}'))
        LFP = np.array(eng.eval(f'LFP.{group}'))
        return wavelet.astype(np.int32) , LFP.astype(np.int32)

class Database:
    def create_databaseTables(self,conn,cursor):

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
                run INT,
                category VARCHAR(50),
                stimGroup VARCHAR(50),
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
                channelNumber INT,
                channelLabel VARCHAR(100),       
                trial INT,
                LFP_data BLOB,
                wavelet_data BLOB,
                FOREIGN KEY (session) REFERENCES sessions(session)
            )
        """)
        
        conn.commit()

    def insert_subject(self,conn,cursor,subject,run,stimGroup,category,lenTime,freqScale,waveletShape):
        
        cursor.execute("SELECT session FROM sessions WHERE subject = %s AND  run = %s AND stimGroup = %s AND category = %s",
                   (subject, run, stimGroup, category))
        result = cursor.fetchone()

        if result:
            session = result[0]
        else:
            cursor.execute("INSERT INTO sessions (subject, run,  stimGroup, category,timeStart, timeStop, freqScale, xBinsWavelet, yBinsWavelet) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (subject, run, stimGroup, category, lenTime[0][0].tolist(), lenTime[0][1].tolist(), freqScale, waveletShape[0], waveletShape[1]))
            session = cursor.lastrowid
            conn.commit()

        return session

    def insert_subjectData(self, conn,cursor,data_list):

        insert_query = """
            INSERT INTO arrays (session, channelNumber, channelLabel, trial, LFP_data, wavelet_data) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_query, data_list)
        
        conn.commit()

    def count_rows(self, cursor, table_name):

        query = f"SELECT COUNT(*) FROM {table_name}"
        cursor.execute(query)

        row_count = cursor.fetchone()[0]

        return row_count

if __name__ == "__main__":

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    eng = matlab.engine.connect_matlab('primary')

    groupLabels = eng.eval('groupLabels')
    stimGroup = eng.eval('stimGroup')
    subject = eng.eval('subject')
    frequencyScale = np.array(eng.eval('freqScale'))
    freqScale = json.dumps(frequencyScale.tolist())
    lenTime = np.array(eng.eval('lenTime')).astype(np.int32)
    chanNums = np.array(eng.eval('chanNums')).astype(np.int32)
    run = np.array(eng.eval('run')).tolist()
    chanLabels = eng.eval('chanLabels')
    
    dataLoader = MatlabDataLoader()

    db = Database()
    if (createNewDatabase == True):
        db.create_databaseTables(conn,cursor)
    else:
        cursor.execute("USE my_new_database")

    for category in groupLabels:
        wavelet, LFP = dataLoader.get_data(eng, category)
        waveletShape = wavelet[:,::4,:,:].shape
        print(waveletShape) 
        KeyboardInterrupt
        session = db.insert_subject(conn,cursor,subject,run,stimGroup,category,lenTime,freqScale,[waveletShape[0],waveletShape[1]])
        print(category)
        
        delete_query = "DELETE FROM arrays WHERE session = %s"
        cursor.execute(delete_query, (session,))
        conn.commit()

        for chanIdx,channel in enumerate(chanNums):

            data_list = []
            print(channel.item())
            print(chanLabels[chanIdx][0])

            for trial in range(wavelet.shape[-2]):
                LFP_data = LFP[:, trial, chanIdx]
                wavelet_data = wavelet[:, ::4, trial, chanIdx]
                
                waveletBuffer = io.BytesIO()
                np.savez_compressed(waveletBuffer, wavelet_data)
                waveletBuffer.seek(0)
                compressedWaveletData = waveletBuffer.read()  # Extract binary data from buffer

                LFPbuffer = io.BytesIO()
                np.savez_compressed(LFPbuffer, LFP_data)
                LFPbuffer.seek(0)
                compressedLFPData = LFPbuffer.read()  # Extract binary data from buffer
                data_list.append((session, channel.item(), chanLabels[chanIdx][0], trial+1, compressedLFPData, compressedWaveletData))

            db.insert_subjectData(conn, cursor, data_list)

    # arrays_row_count = db.count_rows(conn,cursor,"arrays")
    # print(f"Number of rows in 'arrays' table: {arrays_row_count}")

    cursor.close()
    conn.close()