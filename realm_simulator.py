import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# Realm core functions
def realm_curvature(x, y, alpha, beta):
    return np.sin(alpha * x) * np.cos(beta * y)

def entropy_curve(x, y, alpha, beta):
    dz_dx = alpha * np.cos(alpha * x) * np.cos(beta * y)
    dz_dy = -beta * np.sin(alpha * x) * np.sin(beta * y)
    return np.sqrt(dz_dx**2 + dz_dy**2)

def simulate_geodesic_path(start, end, alpha, beta, steps=200):
    t = np.linspace(0, 1, steps)
    path_x = start[0] + t * (end[0] - start[0])
    path_y = start[1] + t * (end[1] - start[1])
    path_z = realm_curvature(path_x, path_y, alpha, beta)
    entropy = entropy_curve(path_x, path_y, alpha, beta)
    return path_x, path_y, path_z, entropy

# Streamlit Page Config
st.set_page_config(page_title="Realm Theory Visual Simulator", layout="wide")

st.markdown("""
<style>
    .main {
        background-color: #0f1117;
        color: #f0f0f0;
        font-family: 'Segoe UI', sans-serif;
    }
    .block-container {
        padding-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Title and Introduction
st.title("🌀 Realm Theory Visual Simulator")
st.markdown("""
Welcome to the **Realm Theory** simulator — where science fiction meets scientific future.

This interactive tool lets **students**, **researchers**, **investors**, and even **Marvel fans** explore:
- The curvature of space-time as defined by unified tensor fields.
- The flow of entropy that drives quantum collapse.
- Real-time simulation of **quantum teleportation paths** in a unified universe model.

> _“With great curvature comes great entanglement.”_ — Realm-Man, probably
""")

# Sidebar - Universal Controls
st.sidebar.header("🎮 Universal Controls")
alpha = st.sidebar.slider('α (Curvature Coupling)', 0.1, 5.0, 1.0)
beta = st.sidebar.slider('β (Field Feedback)', 0.1, 5.0, 0.5)
start_x = st.sidebar.slider('Start X (Observer)', -10.0, 10.0, -8.0)
start_y = st.sidebar.slider('Start Y (Observer)', -10.0, 10.0, -8.0)
end_x = st.sidebar.slider('End X (Target)', -10.0, 10.0, 8.0)
end_y = st.sidebar.slider('End Y (Target)', -10.0, 10.0, 8.0)
mode = st.sidebar.radio("🧭 Simulation Mode", ["Observer", "Traveler"])

# Simulation Data
start = np.array([start_x, start_y])
end = np.array([end_x, end_y])
x = np.linspace(-10, 10, 150)
y = np.linspace(-10, 10, 150)
X, Y = np.meshgrid(x, y)
Z = realm_curvature(X, Y, alpha, beta)
gx, gy, gz, entropy = simulate_geodesic_path(start, end, alpha, beta)

# TABS for Visualization
tabs = st.tabs([
    "🌐 Tensor Field", 
    "🧠 Entropy Flow", 
    "🧭 Geodesic Path", 
    "🎥 Animated Teleportation", 
    "📖 Control Reference"
])

with tabs[0]:
    st.subheader("🌐 Realm Tensor Field")
    fig1 = plt.figure(figsize=(10, 6))
    ax1 = fig1.add_subplot(111, projection='3d')
    ax1.plot_surface(X, Y, Z, cmap='plasma', alpha=0.7)
    ax1.set_xlabel("X Axis")
    ax1.set_ylabel("Y Axis")
    ax1.set_zlabel("Curvature")
    ax1.set_title("3D Visualization of Realm Tensor Field")
    st.pyplot(fig1)

with tabs[1]:
    st.subheader("🧠 Entropy Flow Along Geodesic")
    fig2 = plt.figure(figsize=(10, 4))
    plt.plot(np.linspace(0, 1, len(entropy)), entropy, color='limegreen', linewidth=2)
    plt.xlabel("Geodesic Progress")
    plt.ylabel("Entropy")
    plt.title("Information Flow (Entropy) During Realm Travel")
    st.pyplot(fig2)

with tabs[2]:
    st.subheader("🧭 Quantum Geodesic Path")
    fig3 = plt.figure(figsize=(10, 6))
    ax3 = fig3.add_subplot(111, projection='3d')
    ax3.plot(gx, gy, gz, color='cyan', linewidth=2, label='Quantum Geodesic')
    ax3.scatter(start[0], start[1], realm_curvature(*start, alpha, beta), color='blue', s=50, label='Observer')
    ax3.scatter(end[0], end[1], realm_curvature(*end, alpha, beta), color='orange', s=50, label='Target')
    ax3.set_xlabel("X Axis")
    ax3.set_ylabel("Y Axis")
    ax3.set_zlabel("Curvature")
    ax3.set_title("Shortest Realm Path Between Observer and Target")
    ax3.legend()
    st.pyplot(fig3)

with tabs[3]:
    st.subheader("🎥 Quantum Teleportation (Traveler Mode)")
    fig4 = plt.figure(figsize=(10, 6))
    ax4 = fig4.add_subplot(111, projection='3d')
    if mode == "Traveler":
        for i in range(0, len(gx), 5):
            ax4.plot(gx[:i+1], gy[:i+1], gz[:i+1], color='magenta', linewidth=2)
    else:
        ax4.plot(gx, gy, gz, color='gray', linewidth=2)
    ax4.set_xlabel("X Axis")
    ax4.set_ylabel("Y Axis")
    ax4.set_zlabel("Curvature")
    ax4.set_title("Animated Geodesic Travel (Enable Traveler Mode to Animate)")
    st.pyplot(fig4)

with tabs[4]:
    st.subheader("📖 Control & Theory Reference")
    st.markdown("""
    - **α (Alpha)**: Curvature coupling — increases warping of Realm space.
    - **β (Beta)**: Field-curvature feedback — controls how energy responds to geometry.
    - **Observer / Target**: Start and end coordinates of the Realm teleportation.
    - **Entropy Flow**: Represents how information complexity changes along travel path.
    - **Geodesic Path**: Shows how the Realm guides entangled or traveling entities.
    - **Mode**: 
        - `Observer`: Shows full path.
        - `Traveler`: Step-by-step visual of teleportation.

    ---
    **Built for Students 👨‍🎓, Theorists 🧠, Investors 💼, and Sci-fi Dreamers 🚀**
    """)
