from flask import Flask, request, jsonify, session, render_template, redirect, url_for, flash
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import random   
from email.mime.text import MIMEText
import smtplib
from flask_mail import Mail, Message
from flask_cors import CORS
from chatbot import GabayDisasterChatbot
import mysql.connector  as emergency_db
import os
bot = GabayDisasterChatbot()
import mysql.connector as admin_dashboard

# Initialize Flask app once
app = Flask(__name__)   
app.secret_key = 'your_secret_key'

# Apply CORS once
CORS(app)

# Database configuration for user database
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'gabay_users'

# Initialize MySQL connection for user database
mysql = MySQL(app)

# Flask-Mail Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'vincegonato326@gmail.com'
app.config['MAIL_PASSWORD'] = 'rjtygpqbgcwpygcf'
mail = Mail(app)

# Global code store
verification_code = None

# MySQL Database connection for emergency locations
def get_emergency_db_connection():
    # Use emergency_db instead of mysql.connector
    connection = emergency_db.connect(
        host='localhost',
        user='root',
        password='',
        database='emergency_loc'
    )
    return connection
# (Landing page)
@app.route("/", methods=["GET"])
def index():
    return render_template("landingpage.html")

@app.route('/landing')
def landing():
    return render_template('landingpage.html')

#(login/signup page)
@app.route("/frontpage", methods=["GET"])
def frontpage():
    return render_template("frontpage.html")

# Route to handle user sign-up
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.form
        first_name = data.get("firstName")
        last_name = data.get("lastName")
        email = data.get("email")
        address = data.get("address")
        phone = data.get("number")
        password = data.get("pw")

        # Hash the password before inserting into the database
        hashed_password = generate_password_hash(password)

        # Create a new database connection
        cur = mysql.connection.cursor()

        # Check if the user already exists
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()

        if existing_user:
            return jsonify({"success": False, "message": "User already exists!"})

        # Insert the new user into the database
        cur.execute("INSERT INTO users (firstName, lastName, email, address, number, pw) "
                    "VALUES (%s, %s, %s, %s, %s, %s)", 
                    (first_name, last_name, email, address, phone, hashed_password))
        
        # Commit the changes and close the cursor
        mysql.connection.commit()
        cur.close()

        return jsonify({"success": True, "message": "Account created successfully!"})
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

# Route to handle user sign-in
@app.route("/signin", methods=["POST"])
def signin():
    try:
        data = request.form
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required."})
            
        # Check for admin credentials
        if email == "admin@admin" and password == "admin":
            # Admin login successful, redirect to admin page
            return jsonify({"success": True, "message": "Admin sign-in successful!", "is_admin": True})

        # Create a cursor and query the user by email
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()

        # user[6] = pw, user[1] = firstName, user[2] = lastName, user[4] = address
        if user and check_password_hash(user[6], password):
            full_name = f"{user[1]} {user[2]}"
            address = user[4]

            # Store in session
            session['user_name'] = full_name
            session['user_address'] = address

            return jsonify({"success": True, "message": "Sign-in successful!"})
        else:
            return jsonify({"success": False, "message": "Invalid email or password."})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

# Add a new route for admin page
@app.route("/admin")
def admin():
    selected_year = request.args.get('year', '')
    selected_month = request.args.get('month', '')
    selected_barangay = request.args.get('barangay', '')
    
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if risk assessment data exists
    cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
    risk_count = cursor.fetchone()['count']
    
    if risk_count == 0:
        # If no risk data, populate it
        cursor.close()
        conn.close()
        print("No risk data found - populating now")
        populate_all_barangays_risk()
        
        # Reconnect for the rest of the function
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

    # Check if risk assessment data exists, populate if not
    cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
    risk_count = cursor.fetchone()['count']  # Use dictionary key
    if risk_count == 0:
        # Close the current connection before populating
        cursor.close()
        conn.close()
        
        # No risk data found, populate it
        populate_all_barangays_risk()
        
        # Reconnect after population
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
    
    # Build query with filters
    query = """
        SELECT f.id, f.year, f.month, f.barangay_id, f.incidents, b.area as barangay_name
        FROM fire_incidents f
        JOIN barangays b ON f.barangay_id = b.barangay_id
        WHERE 1=1
    """
    params = []
    
    if selected_year:
        query += " AND f.year = %s"
        params.append(selected_year)
    
    if selected_month:
        query += " AND f.month = %s"
        params.append(selected_month)
    
    if selected_barangay:
        query += " AND f.barangay_id = %s"
        params.append(selected_barangay)
    
    query += " ORDER BY f.year DESC, FIELD(f.month, 'December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January')"
    
    # Execute query
    cursor.execute(query, params)
    fire_data = cursor.fetchall()
    
    # Get years for dropdown
    cursor.execute("SELECT DISTINCT year FROM fire_incidents ORDER BY year DESC")
    year_options = cursor.fetchall()
    
    # Get barangays for dropdown
    cursor.execute("SELECT barangay_id, area FROM barangays ORDER BY area")
    barangays = cursor.fetchall()
    
    # Get risk assessment data - MODIFIED QUERY
    cursor.execute("""
        SELECT r.barangay_id, b.area, r.total_incidents as totalIncidents, 
               r.risk_score as avgScore, r.risk_level
        FROM fire_risk_assessment r
        JOIN barangays b ON r.barangay_id = b.barangay_id
        ORDER BY r.risk_score DESC
    """)
    risk_scores = cursor.fetchall()
    
    print(f"Found {len(risk_scores)} risk assessment records to display")
    
    # Close connection
    cursor.close()
    conn.close()
    
    return render_template('fire_incidents.html', 
                          fire_data=fire_data, 
                          year_options=year_options,
                          barangays=barangays,
                          risk_scores=risk_scores,
                          selected_year=selected_year,
                          selected_month=selected_month,
                          selected_barangay=selected_barangay,
                          active_module='fire')

@app.route("/chatbot", methods=["GET"])
def chatbot_ui():
    try:
        user_name = session.get('user_name', 'Guest')
        user_address = session.get('user_address', 'Not specified')

        return render_template("chatbot.html", user_name=user_name, user_address=user_address)

    except Exception as e:
        print(f"Error retrieving user details: {e}")
        return render_template("chatbot.html", user_name="Guest", user_address="Not specified")

@app.route('/dashboard', methods=["GET"])
def dashboard():
    user_name = session.get('user_name', 'Guest')
    user_address = session.get('user_address', 'Not specified')
    return render_template('dashboard.html', user_name=user_name, user_address=user_address)

@app.route("/chat", methods=["POST"])   
def chat():
    try:
        data = request.json
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({"response": "Please provide a message."})

        response = bot.get_answer(user_message)

        if response == "exit":
            return jsonify({"response": "Goodbye!"})
        
        return jsonify({"response": response})
    
    except Exception as e:
        return jsonify({"response": f"Error processing your request: {str(e)}"})

@app.route("/update_address", methods=["POST"])
def update_address():
    try:
        # Get new address from the request
        data = request.get_json()
        new_address = data.get("address", "").strip()

        # Get user_name from session (format: "Firstname Lastname")
        full_name = session.get('user_name')
        if not full_name:
            return jsonify({"success": False, "message": "User session not found."})

        if not new_address:
            return jsonify({"success": False, "message": "Address is required."})

        if "pasig" not in new_address.lower():
            return jsonify({"success": False, "message": "Address must be within Pasig City."})

        # Split full_name into firstname and lastname
        name_parts = full_name.strip().split()
        if len(name_parts) < 2:
            return jsonify({"success": False, "message": "Invalid user name format."})

        firstname = name_parts[0]
        lastname = " ".join(name_parts[1:])  # Supports compound last names

        # Update user's address in the database
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE users SET address = %s WHERE firstName = %s AND lastName = %s",
            (new_address, firstname, lastname)
        )
        mysql.connection.commit()
        updated_rows = cur.rowcount
        cur.close()

        # Update session so it reflects the new address immediately
        if updated_rows:
            session['user_address'] = new_address
            return jsonify({"success": True, "message": "Address updated successfully!"})
        else:
            return jsonify({"success": False, "message": "User not found or no change in address."})
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    global verification_code
    if request.method == 'POST':
        if 'send_verification' in request.form:
            username = request.form.get('email')
            verification_code = random.randint(100000, 999999)

            msg = Message('Verification Code',
                          sender=app.config['MAIL_USERNAME'],
                          recipients=[username])
            msg.body = f'Your verification code is {verification_code}'

            try:
                mail.send(msg)
                flash('Verification code sent! Check your email.', 'success')
                return render_template('forgot_password.html', stage='verify', email=username, code_status='pending')
            except Exception as e:
                flash(f'Failed to send email. Error: {e}', 'danger')
                return render_template('forgot_password.html')

        elif 'verify_code' in request.form:
            input_code = request.form.get('verification_code')
            email = request.form.get('email')

            if str(verification_code) == input_code:
                flash('Verification successful!', 'success')
                return render_template('forgot_password.html', stage='update_password', email=email, verification_code=input_code, code_status='valid')
            else:
                flash('Invalid verification code. Please try again.', 'danger')
                return render_template('forgot_password.html', stage='verify', email=email, code_status='invalid', verification_code=input_code)

        elif 'update_password' in request.form:
            new_password = request.form.get('new_password')
            email = request.form.get('email')
            hashed_password = generate_password_hash(new_password)

            cur = mysql.connection.cursor()
            cur.execute("UPDATE users SET pw = %s WHERE email = %s", (hashed_password, email))
            mysql.connection.commit()
            cur.close()

            flash('Password successfully updated!', 'success')
            return render_template('forgot_password.html')

    return render_template('forgot_password.html')

# Routes for different emergency location types
@app.route('/api/police_stations', methods=['GET'])
def get_police_stations():
    connection = get_emergency_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM police_stations")
    stations = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(stations)

@app.route('/api/fire_stations', methods=['GET'])
def get_fire_stations():
    connection = get_emergency_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM fire_stations")
    stations = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(stations)

@app.route('/api/evacuation_centers', methods=['GET'])
def get_evacuation_centers():
    connection = get_emergency_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM evacuation_centers")
    centers = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(centers)

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    connection = get_emergency_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM hospitals")
    hospitals = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(hospitals)

# Routes for updating records
@app.route('/api/<table>/<int:id>', methods=['PUT'])
def update_record(table, id):
    # Validate table name to prevent SQL injection
    valid_tables = ['police_stations', 'fire_stations', 'evacuation_centers', 'hospitals']
    if table not in valid_tables:
        return jsonify({"error": "Invalid table name"}), 400
    
    data = request.json
    connection = get_emergency_db_connection()
    cursor = connection.cursor()
    
    # Build SET part of the query dynamically
    set_parts = []
    params = []
    for key, value in data.items():
        # Prevent SQL injection by validating column names
        if key not in ['id', 'name', 'address', 'contact', 'latitude', 'longitude']:
            continue
        set_parts.append(f"{key} = %s")
        params.append(value)
    
    # Add id to params list
    params.append(id)
    
    # Create and execute the update query
    query = f"UPDATE {table} SET {', '.join(set_parts)} WHERE id = %s"
    cursor.execute(query, params)
    
    connection.commit()
    cursor.close()
    connection.close()
    
    return jsonify({"message": f"Record in {table} updated successfully"})

# Routes for deleting records
@app.route('/api/<table>/<int:id>', methods=['DELETE'])
def delete_record(table, id):
    # Validate table name to prevent SQL injection
    valid_tables = ['police_stations', 'fire_stations', 'evacuation_centers', 'hospitals']
    if table not in valid_tables:
        return jsonify({"error": "Invalid table name"}), 400
    
    connection = get_emergency_db_connection()
    cursor = connection.cursor()
    
    query = f"DELETE FROM {table} WHERE id = %s"
    cursor.execute(query, (id,))
    
    connection.commit()
    cursor.close()
    connection.close()
    
    return jsonify({"message": f"Record in {table} deleted successfully"})

# Route to add a new record
@app.route('/api/<table>', methods=['POST'])
def add_record(table):
    # Validate table name to prevent SQL injection
    valid_tables = ['police_stations', 'fire_stations', 'evacuation_centers', 'hospitals']
    if table not in valid_tables:
        return jsonify({"error": "Invalid table name"}), 400
    
    data = request.json
    connection = get_emergency_db_connection()
    cursor = connection.cursor()
    
    # Create columns and placeholders for query
    columns = []
    placeholders = []
    values = []
    
    for key, value in data.items():
        # Skip the id field for insert
        if key == 'id':
            continue
        # Prevent SQL injection by validating column names
        if key not in ['name', 'address', 'contact', 'latitude', 'longitude']:
            continue
        columns.append(key)
        placeholders.append('%s')
        values.append(value)
    
    query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
    cursor.execute(query, values)
    
    connection.commit()
    record_id = cursor.lastrowid
    cursor.close()
    connection.close()
    
    return jsonify({"message": f"Record added to {table} successfully", "id": record_id}), 201

db = admin_dashboard.connect(
    host="localhost",
    user="root",
    password="",
    database="sample_gabay"
)

# Add this function after your db connection setup
def get_db_connection():
    """Return a connection to the database."""
    return admin_dashboard.connect(
        host="localhost",
        user="root",
        password="",
        database="sample_gabay"
    )

def update_fire_risk_assessment():
    """Calculate fire risk assessment using the normalized formula."""
    try:
        # Use a fresh connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current year
        cursor.execute("SELECT MAX(year) as current_year FROM fire_incidents")
        year_result = cursor.fetchone()
        current_year = year_result['current_year'] if year_result['current_year'] else 2025
        
        # Find the barangay with the highest number of incidents (for normalization)
        cursor.execute("""
            SELECT barangay_id, SUM(incidents) as total_incidents
            FROM fire_incidents
            GROUP BY barangay_id
            ORDER BY total_incidents DESC
            LIMIT 1
        """)
        highest_result = cursor.fetchone()
        highest_incidents = float(highest_result['total_incidents']) if highest_result else 1.0
        
        # If there are no incidents at all, avoid division by zero
        if highest_incidents == 0:
            highest_incidents = 1.0
            
        print(f"Highest incident count: {highest_incidents}")
        
        # Get all barangays
        cursor.execute("SELECT barangay_id, area FROM barangays")
        barangays = cursor.fetchall()
        
        # Process each barangay
        for barangay in barangays:
            barangay_id = barangay['barangay_id']
            
            # Get total incidents for this barangay
            cursor.execute("""
                SELECT COALESCE(SUM(incidents), 0) as total_incidents 
                FROM fire_incidents 
                WHERE barangay_id = %s
            """, (barangay_id,))
            total_result = cursor.fetchone()
            
            # Convert to float to avoid Decimal/float type mismatch
            total_incidents = float(total_result['total_incidents'])
            
            # Calculate risk score using the formula: (incidents/highest_incidents) * 10
            if total_incidents > 0:
                risk_score = (total_incidents / highest_incidents) * 10
                
                # Determine risk level based on score
                if risk_score >= 7.5:
                    risk_level = 'high'
                elif risk_score >= 4:
                    risk_level = 'medium'
                else:
                    risk_level = 'low'
            else:
                risk_score = 0.0
                risk_level = 'low'
            
            # Check if record already exists for this barangay and year
            cursor.execute("""
                SELECT id FROM fire_risk_assessment
                WHERE barangay_id = %s AND year = %s
            """, (barangay_id, current_year))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing record
                cursor.execute("""
                    UPDATE fire_risk_assessment
                    SET total_incidents = %s, risk_score = %s, risk_level = %s
                    WHERE id = %s
                """, (int(total_incidents), risk_score, risk_level, existing['id']))
            else:
                # Insert new record
                cursor.execute("""
                    INSERT INTO fire_risk_assessment 
                    (barangay_id, year, total_incidents, risk_score, risk_level)
                    VALUES (%s, %s, %s, %s, %s)
                """, (barangay_id, current_year, int(total_incidents), risk_score, risk_level))
        
        # Commit changes
        conn.commit()
        
        # Close cursor and connection
        cursor.close()
        conn.close()
        
        print(f"Updated risk assessment for {len(barangays)} barangays")
        return True
    except Exception as e:
        print(f"Error updating risk assessment: {e}")
        return False
    
    
def verify_risk_data():
    """Explicitly verify risk data with a completely new connection."""
    try:
        # Create a completely fresh connection
        new_conn = admin_dashboard.connect(
            host="localhost",
            user="root",
            password="",
            database="sample_gabay"
        )
        cursor = new_conn.cursor(dictionary=True)
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'fire_risk_assessment'")
        table_exists = cursor.fetchone()
        if not table_exists:
            print("ERROR: fire_risk_assessment table does not exist!")
            return False
            
        # Check risk data count
        cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
        count = cursor.fetchone()['count']
        print(f"Verified count from fresh connection: {count}")
        
        # Close this connection
        cursor.close()
        new_conn.close()
        return count > 0
    except Exception as e:
        print(f"Verification error: {e}")
        return False

def direct_sql_insert():
    """Try the most basic possible SQL insert."""
    try:
        # Create fresh connection
        conn = admin_dashboard.connect(
            host="localhost",
            user="root",
            password="",
            database="sample_gabay"
        )
        cursor = conn.cursor()
        
        # Print transaction settings
        cursor.execute("SELECT @@autocommit")
        autocommit = cursor.fetchone()[0]
        print(f"Autocommit setting: {autocommit}")
        
        # Simple, minimalist insert
        cursor.execute("""
            INSERT INTO fire_risk_assessment 
            (barangay_id, year, total_incidents, risk_score, risk_level) 
            VALUES (1, 2025, 5, 7.5, 'high')
        """)
        
        # Explicitly commit
        conn.commit()
        print("Direct SQL insert committed")
        
        # Verify immediately
        cursor.execute("SELECT * FROM fire_risk_assessment WHERE barangay_id = 1")
        result = cursor.fetchone()
        print(f"Verification immediately after insert: {result}")
        
        cursor.close()
        conn.close()
        
        # Now verify with a completely new connection
        new_conn = admin_dashboard.connect(
            host="localhost",
            user="root",
            password="",
            database="sample_gabay"
        )
        new_cursor = new_conn.cursor()
        
        new_cursor.execute("SELECT * FROM fire_risk_assessment WHERE barangay_id = 1")
        new_result = new_cursor.fetchone()
        print(f"Verification with new connection: {new_result}")
        
        new_cursor.close()
        new_conn.close()
        
        return True
    except Exception as e:
        print(f"Direct SQL insert error: {e}")
        return False
    
def monitor_risk_table():
    """Monitor the risk table to see if it's being modified elsewhere."""
    try:
        # Initial state
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Insert a test record
        cursor.execute("""
            INSERT INTO fire_risk_assessment 
            (barangay_id, year, total_incidents, risk_score, risk_level) 
            VALUES (999, 2025, 1, 1.0, 'low')
        """)
        conn.commit()
        print("Test record inserted")
        
        # Check record count
        cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
        initial_count = cursor.fetchone()['count']
        print(f"Initial record count: {initial_count}")
        
        cursor.close()
        conn.close()
        
        # Wait a few seconds
        import time
        print("Waiting 5 seconds to see if table is modified...")
        time.sleep(5)
        
        # Check again
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
        final_count = cursor.fetchone()['count']
        print(f"Final record count after waiting: {final_count}")
        
        # Check if our test record is still there
        cursor.execute("SELECT * FROM fire_risk_assessment WHERE barangay_id = 999")
        test_record = cursor.fetchone()
        print(f"Test record present: {test_record is not None}")
        
        cursor.close()
        conn.close()
        
        return initial_count == final_count and test_record is not None
    except Exception as e:
        print(f"Monitoring error: {e}")
        return False
    
# Add this function specifically for initializing data
def populate_all_barangays_risk():
    """Populate risk assessment for all barangays using the normalized formula."""
    try:
        # Use a fresh connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current year
        cursor.execute("SELECT MAX(year) as max_year FROM fire_incidents")
        year_result = cursor.fetchone()
        current_year = year_result['max_year'] if year_result['max_year'] else 2025
        
        # Clear existing records
        cursor.execute("DELETE FROM fire_risk_assessment")
        conn.commit()
        print("Cleared fire_risk_assessment table")
        
        # Find the barangay with the highest number of incidents (for normalization)
        cursor.execute("""
            SELECT barangay_id, SUM(incidents) as total_incidents
            FROM fire_incidents
            GROUP BY barangay_id
            ORDER BY total_incidents DESC
            LIMIT 1
        """)
        highest_result = cursor.fetchone()
        highest_incidents = float(highest_result['total_incidents']) if highest_result else 1.0
        
        # If there are no incidents at all, avoid division by zero
        if highest_incidents == 0:
            highest_incidents = 1.0
            
        print(f"Highest incident count: {highest_incidents}")
        
        # Get all barangays
        cursor.execute("SELECT barangay_id, area FROM barangays")
        barangays = cursor.fetchall()
        print(f"Found {len(barangays)} barangays to process")
        
        # Process each barangay
        for barangay in barangays:
            barangay_id = barangay['barangay_id']
            
            try:
                # Get total incidents for this barangay
                cursor.execute("""
                    SELECT COALESCE(SUM(incidents), 0) as total_incidents 
                    FROM fire_incidents 
                    WHERE barangay_id = %s
                """, (barangay_id,))
                total_result = cursor.fetchone()
                
                # Convert to float to avoid Decimal/float type mismatch
                total_incidents = float(total_result['total_incidents'])
                
                # Calculate risk score using the formula: (incidents/highest_incidents) * 10
                if total_incidents > 0:
                    risk_score = (total_incidents / highest_incidents) * 10
                    
                    # Determine risk level based on score
                    if risk_score >= 7.5:
                        risk_level = 'high'
                    elif risk_score >= 4:
                        risk_level = 'medium'
                    else:
                        risk_level = 'low'
                else:
                    risk_score = 0.0
                    risk_level = 'low'
                
                # Insert a record for this barangay
                cursor.execute("""
                    INSERT INTO fire_risk_assessment 
                    (barangay_id, year, total_incidents, risk_score, risk_level)
                    VALUES (%s, %s, %s, %s, %s)
                """, (barangay_id, current_year, int(total_incidents), risk_score, risk_level))
                
                conn.commit()  # Commit after each insert
                print(f"Added risk assessment for {barangay['area']}: {total_incidents} incidents, score {risk_score:.2f}")
            except Exception as e:
                print(f"Error processing barangay {barangay_id}: {e}")
                # Continue with next barangay
        
        # Verify final count
        cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
        count = cursor.fetchone()['count']
        print(f"Total risk assessments added: {count}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error populating risk assessment: {e}")
        return False

# Add this function for proper initialization
def initialize_risk_assessment():
    """Initialize risk assessment for all barangays."""
    try:
        # Use a fresh connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Count barangays
        cursor.execute("SELECT COUNT(*) as count FROM barangays")
        barangay_count = cursor.fetchone()['count']
        
        # Count risk assessment records
        cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
        risk_count = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        # If we don't have at least one risk record per barangay, recalculate
        if risk_count < barangay_count:
            print(f"Initializing risk assessment (found {risk_count} records for {barangay_count} barangays)")
            return populate_all_barangays_risk()
        return True
    except Exception as e:
        print(f"Error initializing risk assessment: {e}")
        # Try to close the connection if it exists
        try:
            if 'conn' in locals() and conn is not None:
                conn.close()
        except:
            pass
        return False

# Run this once to reset all risk assessment data
def reset_risk_assessment():
    """Clear and repopulate the risk assessment table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM fire_risk_assessment")
        conn.commit()
        cursor.close()
        conn.close()
        print("Risk assessment data cleared")
        return populate_all_barangays_risk()
    except Exception as e:
        print(f"Error resetting risk assessment: {e}")
        return False


@app.route('/admin/update_risk_data')
def admin_update_risk():
    """Admin endpoint to update risk assessment data."""
    try:
        result = populate_all_barangays_risk()
        if result:
            return "Risk data updated successfully"
        else:
            return "Error updating risk data. Check logs for details."
    except Exception as e:
        return f"Error: {str(e)}"

# API endpoint to get fire incident data
@app.route('/api/fire_data')
def fire_data():
    # Use a fresh connection for better reliability
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get all years
    cursor.execute("SELECT DISTINCT year FROM fire_incidents ORDER BY year")
    years = [year['year'] for year in cursor.fetchall()]
    
    # Fire data per year and month
    fire_data = {}
    for year in years:
        # Get monthly data for this year
        cursor.execute("""
            SELECT month, SUM(incidents) as incidents
            FROM fire_incidents
            WHERE year = %s
            GROUP BY month
            ORDER BY FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December')
        """, (year,))
        
        monthly_data = []
        for item in cursor.fetchall():
            monthly_data.append({
                'month': item['month'],
                'incidents': item['incidents']
            })
        
        fire_data[year] = monthly_data
    
    # IMPORTANT: Use the fire_risk_assessment table for risk data
    # This is the same approach used in the admin interface
    cursor.execute("""
        SELECT r.barangay_id, b.area, r.total_incidents as totalIncidents, 
               r.risk_score as avgScore, r.risk_level as riskLevel
        FROM fire_risk_assessment r
        JOIN barangays b ON r.barangay_id = b.barangay_id
        ORDER BY r.risk_score DESC
    """)
    
    fire_prone_areas = []
    for item in cursor.fetchall():
        fire_prone_areas.append({
            'area': item['area'],
            'totalIncidents': item['totalIncidents'],
            'avgScore': float(item['avgScore']),  # Convert Decimal to float
            'riskLevel': item['riskLevel']
        })
    
    # Close connection
    cursor.close()
    conn.close()
    
    return jsonify({
        'years': years,
        'fire_data': fire_data,
        'fire_prone_areas': fire_prone_areas
    })

# API endpoint to get typhoon data
@app.route('/api/typhoon_data')
def typhoon_data():
    cursor = db.cursor(dictionary=True)
    
    # Get all years
    cursor.execute("SELECT DISTINCT year FROM typhoon_incidents ORDER BY year")
    years = [year['year'] for year in cursor.fetchall()]
    
    # Typhoon data per year
    typhoon_data = {}
    for year in years:
        cursor.execute("""
            SELECT month, cyclone_frequency
            FROM typhoon_incidents
            WHERE year = %s
            ORDER BY FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December')
        """, (year,))
        
        monthly_data = []
        for item in cursor.fetchall():
            monthly_data.append({
                'month': item['month'],
                'cyclone_frequency': item['cyclone_frequency']
            })
        
        typhoon_data[year] = monthly_data
    
    cursor.close()
    
    return jsonify({
        'years': years,
        'typhoon_data': typhoon_data
    })
@app.route('/emeloc')
def emeloc():
    
    connection = get_emergency_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM police_stations")
    police_stations = cursor.fetchall()
    cursor.close()
    connection.close()
    return render_template('emeloc.html',police_stations=police_stations)

@app.route('/fire')
def fire_incidents():
    # Get filter parameters
    selected_year = request.args.get('year', '')
    selected_month = request.args.get('month', '')
    selected_barangay = request.args.get('barangay', '')
    
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if risk assessment data exists
    cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
    risk_count = cursor.fetchone()['count']
    
    if risk_count == 0:
        # If no risk data, populate it
        cursor.close()
        conn.close()
        print("No risk data found - populating now")
        populate_all_barangays_risk()
        
        # Reconnect for the rest of the function
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

    # Check if risk assessment data exists, populate if not
    cursor.execute("SELECT COUNT(*) as count FROM fire_risk_assessment")
    risk_count = cursor.fetchone()['count']  # Use dictionary key
    if risk_count == 0:
        # Close the current connection before populating
        cursor.close()
        conn.close()
        
        # No risk data found, populate it
        populate_all_barangays_risk()
        
        # Reconnect after population
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
    
    # Build query with filters
    query = """
        SELECT f.id, f.year, f.month, f.barangay_id, f.incidents, b.area as barangay_name
        FROM fire_incidents f
        JOIN barangays b ON f.barangay_id = b.barangay_id
        WHERE 1=1
    """
    params = []
    
    if selected_year:
        query += " AND f.year = %s"
        params.append(selected_year)
    
    if selected_month:
        query += " AND f.month = %s"
        params.append(selected_month)
    
    if selected_barangay:
        query += " AND f.barangay_id = %s"
        params.append(selected_barangay)
    
    query += " ORDER BY f.year DESC, FIELD(f.month, 'December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January')"
    
    # Execute query
    cursor.execute(query, params)
    fire_data = cursor.fetchall()
    
    # Get years for dropdown
    cursor.execute("SELECT DISTINCT year FROM fire_incidents ORDER BY year DESC")
    year_options = cursor.fetchall()
    
    # Get barangays for dropdown
    cursor.execute("SELECT barangay_id, area FROM barangays ORDER BY area")
    barangays = cursor.fetchall()
    
    # Get risk assessment data - MODIFIED QUERY
    cursor.execute("""
        SELECT r.barangay_id, b.area, r.total_incidents as totalIncidents, 
               r.risk_score as avgScore, r.risk_level
        FROM fire_risk_assessment r
        JOIN barangays b ON r.barangay_id = b.barangay_id
        ORDER BY r.risk_score DESC
    """)
    risk_scores = cursor.fetchall()
    
    print(f"Found {len(risk_scores)} risk assessment records to display")
    
    # Close connection
    cursor.close()
    conn.close()
    
    return render_template('fire_incidents.html', 
                          fire_data=fire_data, 
                          year_options=year_options,
                          barangays=barangays,
                          risk_scores=risk_scores,
                          selected_year=selected_year,
                          selected_month=selected_month,
                          selected_barangay=selected_barangay,
                          active_module='fire')

@app.route('/fire/add', methods=['POST'])
def add_fire_incident():
    if request.method == 'POST':
        # Get form data
        year = request.form['year']
        month = request.form['month']
        barangay_id = request.form['barangay_id']
        incidents = request.form['incidents']
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert fire incident
        cursor.execute("""
            INSERT INTO fire_incidents (year, month, barangay_id, incidents) 
            VALUES (%s, %s, %s, %s)
        """, (year, month, barangay_id, incidents))
        
        # Commit and close
        conn.commit()
        cursor.close()
        conn.close()
        
        # Update risk assessment
        update_fire_risk_assessment()
        
        return redirect(url_for('fire_incidents'))

@app.route('/fire/update', methods=['POST'])
def fire_update():
    cursor = db.cursor()
    
    incident_id = request.form['id']
    year = request.form['year']
    month = request.form['month']
    barangay_id = request.form['barangay_id']
    incidents = request.form['incidents']
    
    query = """
        UPDATE fire_incidents 
        SET year=%s, month=%s, barangay_id=%s, incidents=%s 
        WHERE id=%s
    """
    cursor.execute(query, (year, month, barangay_id, incidents, incident_id))
    db.commit()
    
    cursor.close()
    
    # Update risk assessment after modifying data
    update_fire_risk_assessment()
    
    return redirect(url_for('fire_incidents'))

@app.route('/fire/delete/<int:id>')
def fire_delete(id):
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM fire_incidents WHERE id=%s", (id,))
    db.commit()
    
    cursor.close()
    
    # Update risk assessment after deleting data
    update_fire_risk_assessment()
    
    return redirect(url_for('fire_incidents'))

@app.route('/typhoon')
def typhoon_incidents():
    cursor = db.cursor(dictionary=True)
    
    # Get filter parameters
    year_filter = request.args.get('year', '')
    month_filter = request.args.get('month', '')
    
    # Check if typhoon_incidents table exists, if not create it
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS typhoon_incidents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year INT NOT NULL,
            month VARCHAR(20) NOT NULL,
            cyclone_frequency INT NOT NULL DEFAULT 0,
            CONSTRAINT unique_year_month UNIQUE (year, month)
        )
    """)
    db.commit()
    
    # Build the query with filters
    query = """
        SELECT id, year, month, cyclone_frequency
        FROM typhoon_incidents
        WHERE 1=1
    """
    params = []
    
    if year_filter:
        query += " AND year = %s"
        params.append(year_filter)
    
    if month_filter:
        query += " AND month = %s"
        params.append(month_filter)
    
    query += " ORDER BY year DESC, FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')"
    
    cursor.execute(query, params)
    typhoon_data = cursor.fetchall()
    
    # If no data and no filter, populate with initial data
    if not typhoon_data and not year_filter and not month_filter:
        # Insert initial data for 2024 and 2025
        initial_data = [
            # 2024 data
            (2024, 'January', 0),
            (2024, 'February', 0),
            (2024, 'March', 0),
            (2024, 'April', 0),
            (2024, 'May', 1),
            (2024, 'June', 0),
            (2024, 'July', 1),
            (2024, 'August', 0),
            (2024, 'September', 3),
            (2024, 'October', 2),
            (2024, 'November', 4),
            (2024, 'December', 0),
            # 2025 data
            (2025, 'January', 0),
            (2025, 'February', 0),
            (2025, 'March', 0),
            (2025, 'April', 0),
            (2025, 'May', 0),
            (2025, 'June', 0),
            (2025, 'July', 0),
            (2025, 'August', 0),
            (2025, 'September', 0),
            (2025, 'October', 0),
            (2025, 'November', 0),
            (2025, 'December', 0),
        ]
        
        for data in initial_data:
            cursor.execute("INSERT INTO typhoon_incidents (year, month, cyclone_frequency) VALUES (%s, %s, %s)", data)
        
        db.commit()
        
        # Retrieve the inserted data
        cursor.execute(query, params)
        typhoon_data = cursor.fetchall()
    
    # Get years for filters
    cursor.execute("SELECT DISTINCT year FROM typhoon_incidents ORDER BY year DESC")
    year_options = cursor.fetchall()
    
    # If there are no years in the database, add the current year
    if not year_options:
        year_options = [{'year': 2025}, {'year': 2024}]
    
    cursor.close()
    
    # Convert year_filter to string for template comparison
    selected_year = str(year_filter) if year_filter else ''
    selected_month = month_filter if month_filter else ''
    
    return render_template('typhoon_incidents.html', 
                          typhoon_data=typhoon_data, 
                          year_options=year_options,
                          selected_year=selected_year,
                          selected_month=selected_month,
                          active_module='typhoon')

@app.route('/typhoon/add', methods=['POST'])
def typhoon_add():
    cursor = db.cursor()
    
    year = request.form['year']
    month = request.form['month']
    cyclone_frequency = request.form['cyclone_frequency']
    
    # Check if record for this year/month already exists
    cursor.execute("SELECT id FROM typhoon_incidents WHERE year = %s AND month = %s", (year, month))
    existing = cursor.fetchone()
    
    if existing:
        # Update existing record
        cursor.execute("UPDATE typhoon_incidents SET cyclone_frequency = %s WHERE year = %s AND month = %s", 
                      (cyclone_frequency, year, month))
    else:
        # Insert new record
        cursor.execute("INSERT INTO typhoon_incidents (year, month, cyclone_frequency) VALUES (%s, %s, %s)", 
                      (year, month, cyclone_frequency))
    
    db.commit()
    cursor.close()
    return redirect(url_for('typhoon_incidents'))

@app.route('/typhoon/update', methods=['POST'])
def typhoon_update():
    cursor = db.cursor()
    
    incident_id = request.form['id']
    year = request.form['year']
    month = request.form['month']
    cyclone_frequency = request.form['cyclone_frequency']
    
    query = """
        UPDATE typhoon_incidents 
        SET year=%s, month=%s, cyclone_frequency=%s 
        WHERE id=%s
    """
    cursor.execute(query, (year, month, cyclone_frequency, incident_id))
    db.commit()
    
    cursor.close()
    return redirect(url_for('typhoon_incidents'))

@app.route('/typhoon/delete/<int:id>')
def typhoon_delete(id):
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM typhoon_incidents WHERE id=%s", (id,))
    db.commit()
    
    cursor.close()
    return redirect(url_for('typhoon_incidents'))


if __name__ == '__main__':
    # First check if risk assessment table exists and has proper schema
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'fire_risk_assessment'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Creating fire_risk_assessment table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fire_risk_assessment (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    barangay_id INT NOT NULL,
                    year INT NOT NULL,
                    month VARCHAR(20) DEFAULT NULL,
                    total_incidents INT NOT NULL DEFAULT 0,
                    risk_score DECIMAL(4,2) NOT NULL DEFAULT 0.00,
                    risk_level ENUM('low', 'medium', 'high') NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (barangay_id) REFERENCES barangays(barangay_id)
                )
            """)
            conn.commit()
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error checking/creating table: {e}")
    
    # Now populate the risk data
    print("Populating risk assessment data...")
    populate_all_barangays_risk()

if __name__ == "__main__":
    print("Server starting at http://localhost:5000")
    app.run(debug=True)