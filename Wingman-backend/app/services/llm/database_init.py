import sqlite3

def init_local_database(db_path: str):
    # This is handled mostly by Electron's localDataBridge.js but we create an empty file just in case.
    # Open and close the connection to create the file.
    conn = sqlite3.connect(db_path)
    conn.close()
