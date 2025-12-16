import streamlit as st
import numpy as np
import plotly.graph_objs as go
import matplotlib.pyplot as plt

st.set_page_config(page_title="Realm Simulator", layout="wide")

st.title("🌌 Realm Tensor Field + Quantum Dynamics Visualizer")
st.markdown("Explore **3D tensor field evolution**, **quantum geodesics**, and **entropy flow** by adjusting α and β.")

# Sliders for α and β
alpha = st.slider("α (Curvature Coupling)", 0.0, 5.0, 1.0, 0.1)
beta = st.slider("β (Field-Curvature Feedback)", 0.0, 5.0, 1.0, 0.1)

# 1. Tensor Field (3D Surface)
x = np.linspace(-5, 5, 50)
y = np.linspace(-5, 5, 50)
X, Y = np.meshgrid(x, y)
Z = alpha * np.sin(np.sqrt(X**2 + Y**2)) + beta * np.cos(X * Y)
fig1 = go.Figure(data=[go.Surface(z=Z, x=X, y=Y, colorscale='Viridis')])
fig1.update_layout(title="3D Tensor Field 𝓡_AB", scene=dict(zaxis_title="𝓡_AB"))
st.plotly_chart(fig1, use_container_width=True)

# 2. Entropy / Probability Density Over Time
time = np.linspace(0, 10, 100)
entropy = np.exp(-0.1 * time) * (np.sin(alpha * time) + np.cos(beta * time))
st.subheader("🧪 Entropy / Probability Density Over Time")
fig2, ax2 = plt.subplots()
ax2.plot(time, entropy, label='Entropy Flow')
ax2.set_xlabel("Time")
ax2.set_ylabel("Entropy / P(Φ)")
ax2.legend()
st.pyplot(fig2)

# 3. Quantum Geodesic (Spiral 3D Path)
st.subheader("🌀 Quantum Geodesic Path")
theta = np.linspace(0, 4 * np.pi, 100)
z_geo = np.linspace(-2, 2, 100)
r_geo = alpha * np.sin(beta * theta)
x_geo = r_geo * np.cos(theta)
y_geo = r_geo * np.sin(theta)
fig3 = go.Figure()
fig3.add_trace(go.Scatter3d(x=x_geo, y=y_geo, z=z_geo, mode='lines', line=dict(color='cyan', width=4)))
fig3.update_layout(title="Quantum Geodesic Through Realm", scene=dict(
    xaxis_title='X', yaxis_title='Y', zaxis_title='Z'))
st.plotly_chart(fig3, use_container_width=True)

# 4. Unity Export Support
st.markdown("### 🧩 Unity Export Support")
st.code("""
import json
data = {
    'alpha': alpha,
    'beta': beta,
    'entropy': entropy.tolist(),
    'geodesic': {
        'x': x_geo.tolist(),
        'y': y_geo.tolist(),
        'z': z_geo.tolist()
    }
}
with open('realm_data.json', 'w') as f:
    json.dump(data, f)
""", language='python')
