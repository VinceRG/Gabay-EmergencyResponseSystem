from transformers import AutoModelForQuestionAnswering, AutoTokenizer, pipeline
import torch
import json
import os
import re
from datetime import datetime
import random

class GabayDisasterChatbot:
    def __init__(self, model_name="x`x"):
        """Initialize the Gabay disaster chatbot with a QA model and knowledge base."""
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.qa_pipeline = None
        self.conversation_history = []
        self.knowledge_base = self._load_knowledge_base()
        self.emergency_contacts = self._load_emergency_contacts()
        self.locations = self._load_locations()
        self.user_context = {
            "location": None,
            "disaster_focus": None,
            "previous_topics": []
        }
        
    def _load_knowledge_base(self):
        """Load disaster knowledge specific to Pasig City from a structured dictionary."""
        return {
            "fire": {
                "definition": "An uncontrolled combustion that threatens lives, property and the environment in urban settings of Pasig City.",
                "safety_tips": [
                   "🚨 1. Evacuate immediately if you detect smoke, fire, or hear the fire alarm.",
                    "🌬️ 2. Stay low to the ground where air is clearer and cooler if there's smoke.",
                    "🔥 3. Test doors before opening - if hot to touch, find another exit route.",
                    "🚶‍♂️ 4. Use stairs instead of elevators during a fire emergency.",
                    "📞 5. Call the Pasig City Fire Department at their emergency hotline.",
                    "🚪 6. If trapped in a room, seal door cracks with wet cloths and signal for help from windows."
                ],
                "preparation": [
                    "🚨 Install smoke detectors on each floor of your home or office and test them monthly.",
                    "🗺️ Create a home evacuation plan with two exit routes from each room.",
                    "🔥 Keep a fire extinguisher accessible and learn how to use it properly.",
                    "📄 Store important documents in fireproof containers.",
                    "🏢 Familiarize yourself with your building's fire evacuation procedures.",
                    "📱 Save emergency contact numbers for Pasig City Fire Department in your phone."
                ],
                "causes": [
                    "⚡ Faulty electrical wiring and overloaded circuits",
                    "🍳 Unattended cooking equipment",
                    "🔥 Improper storage of flammable materials",
                    "🚬 Cigarette smoking",
                    "🕯️ Candles and open flames",
                    "<br>🔥🚨 Arson"
                ],
                "local_context": "Pasig City has experienced several significant fire incidents in densely populated areas and industrial zones. The city has implemented strict fire safety codes and regular inspections for commercial buildings. Narrow streets in some neighborhoods can delay fire truck access, making prevention particularly important."
            },
            "typhoon": {
                "definition": " a powerful tropical cyclone that forms over the Northwest Pacific Ocean, typically bringing strong winds, heavy rain, and storm surges. It's similar to a hurricane but occurs in a different region.",
                "safety_tips": [
                        "🏠 Stay indoors during the typhoon and away from windows.",
                        "📻 Listen to local weather updates and emergency broadcasts.",
                        "🚶‍♀️ If evacuation is ordered, follow designated routes to the nearest evacuation center.",
                        "🌊 Avoid crossing flooded areas - just 6 inches of moving water can knock you down.",
                        "📱 Use text messages instead of calls to communicate as networks may be congested.",
                        "💼 Keep emergency supplies and important documents in waterproof containers."
                ],
                "preparation": [
                        "🌀 Secure loose objects outdoors that could be blown away or cause damage.",
                        "🌳 Trim trees and branches that could fall on your house.",
                        "🧰 Prepare an emergency kit with water, non-perishable food, first aid supplies, and medications.",
                        "🔋 Charge electronic devices and keep power banks ready.",
                        "💧 Store enough clean water for drinking and sanitation.",
                        "🚪 Know your evacuation route and the nearest evacuation center in Pasig City."
                ],
                "signals": [
                       "• Signal #1: 🌬️",
                       "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;30-60 kph winds expected within 36 hours",
                       "• Signal #2: 🌪️",
                       "&&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;61-120 kph winds expected within 24 hours",
                       "• Signal #3: 🌪️💨",
                       "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;121-170 kph winds expected within 18 hours",
                       "• Signal #4: 🌀",
                       "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;171-220 kph winds expected within 12 hours",
                       "• Signal #5: 🌪️🔥 ",
                       "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;More than 220 kph winds expected within 12 hours"
                ],
                "local_context": "Pasig City is vulnerable to typhoons, particularly from June to November. The Pasig River can overflow during heavy rainfall, affecting low-lying areas. The city government typically announces class and work suspensions based on PAGASA warnings and local conditions."
            },
            "flooding": {
                "definition": "The overflow of water onto normally dry areas in Pasig City, often caused by heavy rainfall, typhoons, or drainage issues.",
                "safety_tips": [
                    "🌊 Move to higher ground if flooding is imminent.",
                    "🚫🚗 Never walk or drive through floodwaters.",
                    "⚡💧 Be aware of electricity hazards - don't touch electrical equipment if wet or standing in water.",
                    "🧤👢 Wear protective clothing when moving through necessary floodwaters.",
                    "⚠️🌩️ Watch for fallen power lines, debris, and slippery surfaces.",
                    "💧🍽️🧼 Use clean water for drinking, cooking, and personal hygiene, or boil water if unsure."
                ],
                "preparation": [
                    "🗺️📍 Know if your area in Pasig City is flood-prone and understand local flood warning systems.",
                    "📦⚡ Store valuable items and electrical appliances above potential flood levels.",
                    "🧰💊 Prepare an emergency kit with medications, important documents, and supplies.",
                    "🌧️📢 Monitor PAGASA weather updates and Pasig City alerts during rainy season.",
                    "🥫🍞 Keep emergency food that requires no refrigeration or cooking.",
                    "🚪🗺️ Have an evacuation plan ready for your family and know routes to evacuation centers."
                ],
                "flood_levels": [
                    "<br>🟡 <b>Yellow Warning:</b> Flooding possible in low-lying areas<br>",
                    "🟠<b> Orange Warning:</b> Flooding expected in low-lying areas, prepare for possible evacuation<br>",
                    "🔴<b> Red Warning:</b> Serious flooding expected, evacuation likely necessary"
                ],
                "local_context": "Pasig City includes several flood-prone areas, particularly those near the Pasig River and Marikina River. The city has implemented flood control projects and maintains pumping stations, but certain neighborhoods remain vulnerable during heavy rainfall. The local government provides regular updates on flood conditions through the Gabay app and other channels."
            }
        }

    def _load_emergency_contacts(self):
        """Load emergency contacts for Pasig City."""
        return {
            "fire_department": {
                "hotline": "(02) 8643-0000",
                "alternative": "(02) 8643-0179",
                "mobile": "0945-628-1166"
            },
            "police": {
                "main_station": "(02) 8643-0000",
                "east_district": "(02) 8642-5151",
                "west_district": "(02) 8641-0182"
            },
            "hospitals": {
                "pasig_city_general": "(02) 8643-6700",
                "rizal_medical_center": "(02) 8865-5770",
                "the_medical_city": "(02) 8988-1000"
            },
            "city_disaster_risk_reduction": "(02) 8643-0000",
            "red_cross_pasig": "(02) 8654-2582",
            "pasig_command_center": "161"
        }
    
    def _load_locations(self):
        """Load key emergency locations in Pasig City."""
        return {
            "evacuation_centers": [
                {"name": "Pasig Elementary School", "address": "R. Jabson Street, Kapasigan"},
                {"name": "Eusebio High School", "address": "San Miguel, Pasig City"},
                {"name": "Rizal High School", "address": "Dr. Sixto Antonio Avenue"},
                {"name": "Pasig City Sports Center", "address": "Caruncho Avenue"},
                {"name": "Ilaya Covered Court", "address": "Evangelista Avenue, Santolan, Pasig City"},
                {"name": "Santolan Elementary School", "address": "Santolan Road, Santolan, Pasig City"},
                {"name": "Our Lady of Perpetual Help Parish", "address": "Evangelista Avenue, Santolan, Pasig City"},
                {"name": "San Miguel Covered Court", "address": "M. Suarez Avenue, San Miguel, Pasig City"},
                {"name": "Palatiw Barangay Hall", "address": "M. Suarez Avenue, Palatiw, Pasig City"},
                {"name": "Karangalan Covered Court", "address": "Karangalan Village, Dela Paz, Pasig City"},
                {"name": "Child Development Center", "address": "Barangay Kapasigan, Pasig City"},
                {"name": "Sumilang Barangay Hall", "address": "Barangay Sumilang, Pasig City"},
                {"name": "Malinao Covered Court", "address": "Barangay Malinao, Pasig City"},
                {"name": "Manggahan Multipurpose Court", "address": "Barangay Manggahan, Pasig City"},
                {"name": "Kaalinsabay Covered Court", "address": "Barangay Manggahan, Pasig City"},
                {"name": "Napico Multipurpose Hall", "address": "Napico, Manggahan, Pasig City"},
                {"name": "Kapitolyo Barangay Hall", "address": "Barangay Kapitolyo, Pasig City"},
                {"name": "Nagpayong Covered Court", "address": "Nagpayong, Pinagbuhatan, Pasig City"},
                {"name": "Kalinangan Covered Court", "address": "Barangay Caniogan, Pasig City"},
                {"name": "Rosario Elementary School", "address": "Ortigas Avenue Extension, Rosario, Pasig City"},
                {"name": "Blue Grass Multipurpose", "address": "Barangay Rosario, Pasig City"},
                {"name": "Bagong Ilog Elementary School", "address": "Barangay Bagong Ilog, Pasig City"},
                {"name": "Maybunga Elementary School Annex", "address": "Barangay Maybunga, Pasig City"},
                {"name": "Bliss Multipurpose Hall", "address": "Barangay Sta. Lucia, Pasig City"},
                {"name": "UGONG Barangay Hall Parking Area", "address": "Barangay Ugong, Pasig City"}
            ],
            "hospitals": [
                {"name": "Pasig City General Hospital", "address": "Pasig Blvd., Bagong Ilog", "coordinates": "14.5548°N, 121.0670°E"},
                {"name": "Rizal Medical Center", "address": "Pasig Blvd., Bagong Ilog", "coordinates": "14.5542°N, 121.0792°E"},
                {"name": "The Medical City", "address": "Ortigas Avenue, Pasig City", "coordinates": "14.5803°N, 121.0713°E"},
                {"name": "Pasig City Children's Hospital", "address": "Kapasigan, Pasig City", "coordinates": "14.5748°N, 121.0698°E"}
            ],
            "fire_stations": [
                {"name": "Pasig City Fire Station", "address": "Caruncho Avenue", "coordinates": "14.5728°N, 121.0810°E"},
                {"name": "Rosario Fire Station", "address": "Rosario, Pasig City", "coordinates": "14.5868°N, 121.0956°E"}
            ],
            "police_stations": [
                {"name": "Pasig City Police Headquarters", "address": "Caruncho Avenue", "coordinates": "14.5730°N, 121.0819°E"},
                {"name": "East Police District", "address": "C. Raymundo Avenue", "coordinates": "14.5665°N, 121.0901°E"},
                {"name": "West Police District", "address": "San Joaquin, Pasig City", "coordinates": "14.5615°N, 121.0722°E"}
            ]
        }

    def convert_to_context(self):
        """Convert knowledge base to a text context for the QA model."""
        context = "Gabay is a mobile application for Pasig City residents focused on fire, typhoon, and flooding disasters.\n\n"
        
        for disaster, info in self.knowledge_base.items():
            context += f"{disaster.capitalize()} is {info['definition']}\n"
            
            context += f"For {disaster} safety🦺 in Pasig City: "
            context += "; ".join(info['safety_tips']) + ".\n"
            
            context += f"📋To prepare for a {disaster} in Pasig City: "
            context += "; ".join(info['preparation']) + ".\n\n"

            context += f"{disaster.capitalize()} local context in Pasig City: {info['local_context']}\n\n"
            
        # Add emergency contacts and locations
        context += "Emergency contacts in Pasig City: Fire Department: (02) 8643-0000; Police: (02) 8643-0000; "
        context += "Pasig City General Hospital: (02) 8643-6700; Disaster Risk Reduction: (02) 8643-0000; "
        context += "Pasig Command Center: 161.\n\n"
        
        context += "Major evacuation centers include Pasig Elementary School, Eusebio High School, Rizal High School, "
        context += "Pasig City Sports Center, and PAMANA Elementary School.\n\n"
        
        return context
        
    def load_model(self):
        """Load the question answering model."""
        print("Loading model, please wait...")
        self.model = AutoModelForQuestionAnswering.from_pretrained(self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.qa_pipeline = pipeline("question-answering", model=self.model, tokenizer=self.tokenizer)
        print("Model loaded successfully!")
        
    def personalize_response(self, response, disaster=None):
        """Make responses more conversational and Claude-like."""
        # Add conversational openers
        openers = [
            "Based on the information for Pasig City, ",
            "For residents of Pasig City, ",
            "",  # Sometimes no opener for variety
            "To help you stay safe in Pasig City, "
        ]
        
        # Add empathetic phrases for disaster contexts
        empathetic_additions = [
            "Your safety is the priority here. ",
            "I understand this can be concerning. ",
            "Planning ahead can help you feel more prepared. ",
            "These situations can be stressful, but good information helps. ",
            ""  # Sometimes no empathetic phrase
        ]
        
        # Add personalizing follow-ups
        followups = [
            " <br>Does that help with what you needed to know?",
            " <br>Is there anything specific about this you'd like me to clarify?",
            " <br>Would you like more details on any part of this information?",
            " <br>I can provide more specific information if needed.",
            ""  # Sometimes no followup
        ]
        
        # Only add these elements sometimes to keep variety
        if random.random() < 0.7:  # 70% chance to add an opener
            response = random.choice(openers) + response
        
        if disaster and random.random() < 0.5:  # 50% chance to add empathy
            response = random.choice(empathetic_additions) + response
            
        if random.random() < 0.4:  # 40% chance to add a follow-up
            response = response + random.choice(followups)
            
        return response
        
    def format_emergency_info(self, info_type):
        """Format emergency contact or location information in a helpful way."""
        if info_type == "emergency_contacts":
            response = "Here are the key emergency contacts for Pasig City:\n\n"
            
            response += "🚒 **Fire Department**\n"
            response += f"• Main Hotline: {self.emergency_contacts['fire_department']['hotline']}\n"
            response += f"• Alternative: {self.emergency_contacts['fire_department']['alternative']}\n"
            response += f"• Mobile: {self.emergency_contacts['fire_department']['mobile']}\n\n"
            
            response += "👮 **Police**\n"
            response += f"• Main Station: {self.emergency_contacts['police']['main_station']}\n"
            response += f"• East District: {self.emergency_contacts['police']['east_district']}\n"
            response += f"• West District: {self.emergency_contacts['police']['west_district']}\n\n"
            
            response += "🏥 **Hospitals**\n"
            response += f"• Pasig City General: {self.emergency_contacts['hospitals']['pasig_city_general']}\n"
            response += f"• Rizal Medical Center: {self.emergency_contacts['hospitals']['rizal_medical_center']}\n"
            response += f"• The Medical City: {self.emergency_contacts['hospitals']['the_medical_city']}\n\n"
            
            response += "🆘 **Other Emergency Services**\n"
            response += f"• City Disaster Risk Reduction: {self.emergency_contacts['city_disaster_risk_reduction']}\n"
            response += f"• Red Cross Pasig: {self.emergency_contacts['red_cross_pasig']}\n"
            response += f"• Pasig Command Center: {self.emergency_contacts['pasig_command_center']}"
            
            return response
            
        elif info_type == "evacuation_centers":
            response = "Here are the main evacuation centers in Pasig City:\n\n"
            
            for center in self.locations["evacuation_centers"]:
                response += f"**{center['name']}**\n"
                response += f"• Address: {center['address']}\n\n"
                
            return response
            
        elif info_type == "hospitals":
            response = "Here are the main hospitals in Pasig City:\n\n"
            
            for hospital in self.locations["hospitals"]:
                response += f"**{hospital['name']}**\n"
                response += f"• Address: {hospital['address']}\n"
                response += f"• Location: {hospital['coordinates']}\n\n"
                
            return response
        
        elif info_type == "police_stations":
            response = "Here are the Police Stations in Pasig City:\n\n"
        
            for station in self.locations["police_stations"]:
                response += f"**{station['name']}**\n"
                response += f"• Address: {station['address']}\n"
                response += f"• Location: {station['coordinates']}\n\n"
            
            return response
        
        elif info_type == "fire_stations":
            response = "Here are the Fire Stations in Pasig City:\n\n"
        
            for station in self.locations["fire_stations"]:
                response += f"**{station['name']}**\n"
                response += f"• Address: {station['address']}\n"
                response += f"• Location: {station['coordinates']}\n\n"
            
            return response
            
        return "I don't have that specific information available."
        
    def detect_intent(self, question):
        """Detect the user's intent based on the question."""
        question = question.lower()
        
        # Information category intents
        if any(term in question for term in ["contact", "number", "phone", "call", "hotline"]):
            return "emergency_contacts"
            
        if any(term in question for term in ["evacuation", "shelter", "center", "where to go"]):
            return "evacuation_centers"
            
        if any(term in question for term in ["hospital", "medical", "healthcare"]):
            return "hospitals"
            
        # Add specific intent detection for police stations
        if any(term in question for term in ["police", "cops", "law enforcement", "station"]):
            return "police_stations"
        
        if any(term in question for term in ["fire fighter", "bumbero", "station"]):
            return "fire_stations"
            
        # Disaster specific intents
        for disaster in self.knowledge_base:
            if disaster in question:
                # Safety during disaster
                if any(term in question for term in ["what to do", "how to", "safety", "protect", "during"]):
                    return f"{disaster}_safety"
                    
                # Preparation before disaster
                if any(term in question for term in ["prepare", "get ready", "before", "preparation", "prevent"]):
                    return f"{disaster}_preparation"
                    
                # Definition/explanation of disaster
                if any(term in question for term in ["what is", "define", "what's a", "explain", "description"]):
                    return f"{disaster}_definition"
                    
                # Local context for disaster
                if any(term in question for term in ["pasig", "local", "area", "city", "specific"]):
                    return f"{disaster}_local"
                    
                # General information about the disaster
                return f"{disaster}_general"
                
        # General help intent
        if any(term in question for term in ["help", "assist", "guidance", "support"]):
            return "general_help"
            
        # App information intent
        if any(term in question for term in ["app", "gabay", "application", "mobile"]):
            return "app_info"
            
        # Couldn't determine intent
        return "unknown"

    def get_answer(self, question):
        """Get answer using context-aware processing with Claude-like responses."""
        # Check for special commands
        if question.lower() in ["help", "commands"]:
            return self.get_help_message()
            
        if question.lower() in ["exit", "quit", "bye"]:
            return "exit"
            
        # Store the question in history
        self.conversation_history.append({"role": "user", "message": question, "time": datetime.now().strftime("%H:%M:%S")})
        
        # Detect user intent
        intent = self.detect_intent(question)
        
        # Handle information category intents
        if intent == "emergency_contacts":
            response = self.format_emergency_info("emergency_contacts")
            self._store_response(response)
            return response
            
        if intent == "evacuation_centers":
            response = self.format_emergency_info("evacuation_centers")
            self._store_response(response)
            return response
            
        if intent == "hospitals":
            response = self.format_emergency_info("hospitals")
            self._store_response(response)
            return response
        
        if intent == "police_stations":
            response = self.format_emergency_info("police_stations")
            self._store_response(response)
            return response
        
        if intent == "fire_stations":
            response = self.format_emergency_info("fire_stations")
            self._store_response(response)
            return response
            
        if intent == "app_info":
            response = ("Gabay is a user-friendly mobile application designed to assist Pasig City residents "
                       "during disasters and emergencies. It focuses on three specific disasters: fire, typhoon, "
                       "and flooding. The app helps users locate nearby evacuation centers, hospitals, fire departments, "
                       "and police stations while providing emergency hotlines and disaster response guidelines. "
                       "You can download Gabay on your smartphone or tablet.")
            response = self.personalize_response(response)
            self._store_response(response)
            return response
            
        # Handle disaster specific intents
        if "_" in intent:
            disaster, aspect = intent.split("_", 1)
            
            if disaster in self.knowledge_base:
                # Update user context
                self.user_context["disaster_focus"] = disaster
                if disaster not in self.user_context["previous_topics"]:
                    self.user_context["previous_topics"].append(disaster)
                
                if aspect == "safety":
                    tips = self.knowledge_base[disaster]["safety_tips"]
                    # Start with a contextual intro
                    response = f"If you're facing a {disaster} emergency in Pasig City, here's what you should do:\n\n"
                    
                    # Add numbered tips in a conversational format
                    for i, tip in enumerate(tips, 1):
                        response += f"{i}. {tip}<br>"
                        
                    # Add contextual relevance to Pasig City
                    response += f"\nThese safety measures are especially important in Pasig City's context, where {disaster}s {self._get_local_risk_factor(disaster)}."
                    
                    response = self.personalize_response(response, disaster)
                    self._store_response(response)
                    return response
                    
                elif aspect == "preparation":
                    preps = self.knowledge_base[disaster]["preparation"]
                    response = f"To prepare for a {disaster} in Pasig City, here are some important steps:\n\n"
                    
                    for i, prep in enumerate(preps, 1):
                        response += f"{i}. {prep}\n"
                        
                    # Add locally relevant preparation advice
                    if disaster == "flooding":
                        response += "\nIt's particularly important to know your neighborhood's flood risk level in Pasig City. Areas near the Pasig River like Santolan and parts of Manggahan are at higher risk."
                    elif disaster == "fire":
                        response += "\nIn densely populated areas of Pasig City like Pinagbuhatan and Kapasigan, having evacuation plans is especially critical due to the close proximity of structures."
                    elif disaster == "typhoon":
                        response += "\nConsider the wind exposure of your location in Pasig City. High-rise buildings in Ortigas Center face different risks than low-lying areas near the river systems."
                    
                    response = self.personalize_response(response, disaster)
                    self._store_response(response)
                    return response
                    
                elif aspect == "definition" or aspect == "general":
                    response = f"{disaster.capitalize()} is {self.knowledge_base[disaster]['definition']}\n\n"
                    
                    # Add more comprehensive information
                    if disaster == "fire":
                        response += "Fires can spread rapidly in urban areas like Pasig City, particularly in densely populated residential neighborhoods and commercial districts. Common causes include: <br>"
                        response += "<br> ".join(self.knowledge_base[disaster]["causes"][:-1]) + ", and " + self.knowledge_base[disaster]["causes"][-1] + "."
                    elif disaster == "typhoon":
                        response += "Typhoon warnings in the Philippines use a signal system:<br>"
                        for signal in self.knowledge_base[disaster]["signals"]:
                            response += f"<strong>&nbsp;&nbsp;&nbsp;&nbsp;{signal}</strong><br>"
                    elif disaster == "flooding":
                        response += "Flood warnings in Metro Manila including Pasig City use a color-coded system: "
                        response += " ".join(self.knowledge_base[disaster]["flood_levels"]) + "."
                    
                    response = self.personalize_response(response, disaster)
                    self._store_response(response)
                    return response
                    
                elif aspect == "local":
                    response = f"In Pasig City's specific context: {self.knowledge_base[disaster]['local_context']}"
                    response = self.personalize_response(response, disaster)
                    self._store_response(response)
                    return response
        
        # Handle general help intent
        if intent == "general_help":
            response = ("The Gabay app can help you during emergencies in Pasig City in several ways:\n\n"
                       "1. Get real-time updates about fire, typhoon, and flooding emergencies\n"
                       "2. Find the nearest evacuation centers, hospitals, fire stations, and police stations\n"
                       "3. Access emergency contact numbers for quick assistance\n"
                       "4. Learn safety tips specific to different disaster scenarios\n\n"
                       "You can ask me specific questions about any of these topics, or about preparing for "
                       "and responding to fires, typhoons, or floods in Pasig City.")
            
            response = self.personalize_response(response)
            self._store_response(response)
            return response
        
        # For unknown intents or general questions, use the QA model
        try:
            context = self.convert_to_context()
            if not self.qa_pipeline:
                self.load_model()
                
            result = self.qa_pipeline(question=question, context=context)
            
            # Check confidence score
            if result['score'] < 0.1:
                # Use context from previous conversation to give better responses
                if self.user_context["disaster_focus"]:
                    disaster = self.user_context["disaster_focus"]
                    response = (f"I'm not quite sure about that specific question. However, since we were discussing {disaster}s, "
                              f"you might be interested in knowing that {self.knowledge_base[disaster]['local_context']} "
                              f"Would you like to know more about {disaster} safety tips or preparation measures for Pasig City residents?")
                else:
                    response = ("I'm not confident I understand your question completely. The Gabay app focuses on three main disasters "
                               "in Pasig City: fire, typhoon, and flooding. Could you clarify which of these you'd like information about, "
                               "or whether you need emergency contacts, evacuation centers, or safety guidelines?")
            else:
                # Enhance the model's answer with personalization
                response = result['answer']
                
                # Try to detect which disaster it might be related to
                for disaster in self.knowledge_base:
                    if disaster in question.lower() or disaster in response.lower():
                        response = self.personalize_response(response, disaster)
                        break
                else:
                    response = self.personalize_response(response)
                
            self._store_response(response)
            return response
            
        except Exception as e:
            response = ("I apologize, but I'm having trouble processing that question right now. Could you try rephrasing it? "
                       "I can help with information about fires, typhoons, and flooding in Pasig City, including emergency contacts, "
                       "evacuation centers, and safety guidelines.")
            self._store_response(response)
            return response
    
    def _store_response(self, response):
        """Store the chatbot's response in conversation history."""
        self.conversation_history.append({"role": "assistant", "message": response, "time": datetime.now().strftime("%H:%M:%S")})
    
    def _get_local_risk_factor(self, disaster):
        """Get contextual information about local risk factors in Pasig City."""
        if disaster == "fire":
            return "can spread quickly due to densely populated residential areas and older structures in some neighborhoods"
        elif disaster == "typhoon":
            return "can cause significant disruption due to Pasig's location along river systems"
        elif disaster == "flooding":
            return "frequently affect low-lying areas near the Pasig and Marikina Rivers"
        else:
            return "require specific preparedness measures in urban settings"
    
    def get_help_message(self):
        """Return help information about using the chatbot."""
        help_message = """
Welcome to the Gabay Disaster Assistant for Pasig City!

I can help you with:

🚨 **Emergency Information**
- Contact numbers for fire departments, police, hospitals, and emergency services
- Locations of evacuation centers and medical facilities in Pasig City

🔥 **Fire Emergencies**
- What to do during a fire
- How to prepare for fire emergencies
- Prevention tips specific to Pasig City

🌀 **Typhoon Response**
- Typhoon warning signals and what they mean
- Safety measures during typhoons
- Preparation guidelines before typhoon season

🌊 **Flood Management**
- Flood warning levels in Pasig City
- Safety during flooding
- Preparation for flood-prone areas

Examples of questions you can ask:
- "What should I do during a fire in Pasig City?"
- "Where are the evacuation centers in Pasig?"
- "How do I prepare for typhoon season?"
- "What are the emergency contact numbers?"
- "What is the flood warning system in Pasig?"

Type 'exit' or 'quit' to end our conversation.
"""
        return help_message
        
    def save_conversation(self, filename="gabay_chat_history.json"):
        """Save the conversation history to a file."""
        with open(filename, 'w') as f:
            json.dump(self.conversation_history, f, indent=2)
        return f"Conversation saved to {filename}"


def run_chatbot():
    """Run the interactive Gabay disaster chatbot."""
    chatbot = GabayDisasterChatbot()
    
    print("🌍 Gabay Disaster Assistant for Pasig City")
    print("I'm here to help with information about fire, typhoon, and flooding emergencies.")
    print("Type 'help' for more information or 'exit' to quit.")
    
    try:
        while True:
            user_input = input("\nYou: ")
            
            if not user_input.strip():
                continue
                
            response = chatbot.get_answer(user_input)
            
            if response == "exit":
                print("👋 Thank you for using Gabay Disaster Assistant. Saving conversation history...")
                chatbot.save_conversation()
                print("Stay safe in Pasig City!")
                break
                
            print(f"Gabay: {response}")
            
    except KeyboardInterrupt:
        print("\n\nChatbot session ended. Saving conversation history...")
        chatbot.save_conversation()
        print("Stay safe in Pasig City!")


if __name__ == "__main__":
    run_chatbot()