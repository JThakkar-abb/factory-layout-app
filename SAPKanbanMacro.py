import json
import sys
import os
import subprocess
import re
import time
import requests
# from pywinauto import Application, Desktop
import win32com.client
try:
    pass
except ImportError:
    Application = None
    Desktop = None


def open_sap_connection(connection_name="10.1.  PR1 - AMSAP ERP Production  (US Users)"):
    """Open SAP logon and open the connection containing connection_name."""
    sap = None
    try:

        path = r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe"
        sap = subprocess.Popen(path)
        time.sleep(10)

        SapGuiAuto = win32com.client.GetObject('SAPGUI')
        if not type(SapGuiAuto) == win32com.client.CDispatch:
            return

        application = SapGuiAuto.GetScriptingEngine
        if not type(application) == win32com.client.CDispatch:
            SapGuiAuto = None
            return
        connection = application.OpenConnection(connection_name, True)

        if not type(connection) == win32com.client.CDispatch:
            application = None
            SapGuiAuto = None
            return

        session = connection.Children(0)
        if not type(session) == win32com.client.CDispatch:
            connection = None
            application = None
            SapGuiAuto = None
            return

        # session.findById("wnd[0]/usr/txtRSYST-BNAME").text = "username"
        # session.findById("wnd[0]/usr/pwdRSYST-BCODE").text = "password"
        session.findById("wnd[0]").sendVKey(0)
        
        print(sys.exc_info())
        sap_automation_script()

    finally:
        try:
            if 'session' in locals() and session is not None:
                session.findById("wnd[0]").close()
        except Exception:
            pass
        if sap is not None:
            try:
                sap.kill()
            except Exception:
                pass
        session = None
        connection = None
        application = None
        SapGuiAuto = None

def sap_automation_script():
    """Automate SAP GUI script for SQ00 and export KANBANEXPORT.txt."""
    application = None
    connection = None
    session = None

    try:
        if not application:
            SapGuiAuto = win32com.client.GetObject('SAPGUI')
            application = SapGuiAuto.GetScriptingEngine

        if not connection:
            connection = application.Children(0)

        if not session:
            session = connection.Children(0)

        session.findById("wnd[0]").maximize()
        session.findById("wnd[0]/tbar[0]/okcd").text = "SQ00"
        session.findById("wnd[0]").sendVKey(0)
        session.findById("wnd[0]/tbar[1]/btn[19]").press()

        grid = session.findById("wnd[1]/usr/cntlGRID1/shellcont/shell")
        grid.currentCellRow = 1
        grid.selectedRows = "1"
        grid.doubleClickCurrentCell()

        session.findById("wnd[0]/usr/cntlGRID_CONT0050/shellcont/shell").firstVisibleRow = 100

        qnum = session.findById("wnd[0]/usr/ctxtRS38R-QNUM")
        qnum.text = "Kanban_loc"
        qnum.setFocus()
        qnum.caretPosition = 10

        session.findById("wnd[0]/tbar[1]/btn[8]").press()

        session.findById("wnd[0]/usr/ctxtSP$00001-LOW").caretPosition = 2
        session.findById("wnd[0]").sendVKey(2)
        session.findById("wnd[1]/tbar[0]/btn[12]").press()

        session.findById("wnd[0]/usr/ctxtSP$00001-LOW").text = "1150"
        session.findById("wnd[0]/usr/ctxtSP$00002-LOW").text = "150"

        sp2 = session.findById("wnd[0]/usr/ctxtSP$00002-LOW")
        sp2.setFocus()
        sp2.caretPosition = 3

        session.findById("wnd[0]/tbar[1]/btn[8]").press()

        export_shell = session.findById("wnd[0]/usr/cntlCONTAINER/shellcont/shell")
        export_shell.pressToolbarContextButton("&MB_EXPORT")
        export_shell.selectContextMenuItem("&PC")

        session.findById("wnd[1]/tbar[0]/btn[0]").press()

        filename = session.findById("wnd[1]/usr/ctxtDY_FILENAME")
        filename.text = "KANBANEXPORT.txt"
        filename.caretPosition = 16
        session.findById("wnd[1]/tbar[0]/btn[11]").press()
        
    except Exception as e:
        print(f"✗ SAP automation failed: {e}")

def uploadViaApi(file_path):
    api_url = "http://10.90.104.34:9240/api/products/upload"
    # Convert file to binary
    with open(file_path, 'rb') as f:
        file_data = f.read()
    # Create multipart form data
    files = {'formFile': (file_path, file_data, 'text/csv')}
    # Send POST request to API with formFile and fileName fields
    response = requests.post(api_url, files=files, data={'fileName': os.path.basename(file_path)})
    if response.status_code == 200:
        print("✓ File uploaded successfully")
    else:
        print(f"✗ File upload failed: {response.status_code} - {response.text}")
    

def convert_sap_to_csv(input_file, output_file):
    """Convert SAP txt file with | delimiter to CSV with ; delimiter"""
    try:
        with open(input_file, 'r', encoding='latin-1') as infile:
            # Remove the first 6 lines before starting the rest of the steps
            for _ in range(6):
                next(infile, None)
            with open(output_file, 'w', encoding='latin-1') as outfile:
                for line_num, line in enumerate(infile, 1):
                    if(line.__contains__("|") == False or len(line) < 1):
                        print(f"Skipping Line {line_num}: {line.strip()} (No | delimiter found)")
                        continue
                    # Replace | delimiter with ;
                    converted_line = line.rstrip('\n').replace('|', ';')
                    # Remove semicolons from start and end of line
                    converted_line = converted_line.lstrip(';')
                    # Remove Last Column
                    # print(f"Original Line {line_num}: {converted_line}")
                    converted_line = ';'.join(converted_line.split(';')[:-2])
                    # print(f"Final Line {line_num}: {converted_line}")

                    # Trim whitespace from each field
                    converted_line = ';'.join(field.strip() for field in converted_line.split(';'))
                    
                    # Remove leading 0s from last column
                    fields = converted_line.split(';')
                    if len(fields) > 1:
                        fields[-1] = fields[-1].lstrip('0')  # Ensure we don't end up with an empty string
                        # Convert next to last column to int from decimal
                        fields[-2] = fields[-2].split('.')[0]  # Remove decimal part
                        fields[-2] = fields[-2].replace(',', '')  # Remove commas from the number
                        #remove quotes inside column
                        fields[1] = fields[1].replace('"', '')  # Remove quotes from second column
                    converted_line = ';'.join(fields)
                    
                    # Add StationCode to end of line 1
                    if line_num == 1:
                        converted_line += ';StationCode'
                    else:
                        if(len(fields) > 1):
                            converted_line += ';'
                    outfile.write(converted_line + '\n')
        print(f"✓ Conversion complete: {input_file} → {output_file}")
    except FileNotFoundError:
        print(f"✗ Error: File '{input_file}' not found")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 1:
        print("Usage: python script.py <input_file.txt> <output_file.csv>")
        sys.exit(1)
    open_sap_connection()
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert_sap_to_csv(input_file, output_file)
    uploadViaApi(output_file)
