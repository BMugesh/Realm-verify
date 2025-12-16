import streamlit as st
import numpy as np
import plotly.graph_objs as go
import matplotlib.pyplot as plt
import json
from datetime import datetime

# ============== PAGE CONFIG ==============

st.set_page_config(page_title="Realm Advanced Simulator", layout="wide")

st.markdown("""
<style>
    .main {
        background: linear-gradient(135deg, #0f1117 0%, #1a1a2e 100%);
        color: #f0f0f0;
        font-family: 'Segoe UI', 'Courier New', monospace;
    }
    h1, h2, h3 {
        color: #00d4ff;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }
    .equation-box {
        background: rgba(255, 100, 200, 0.05);
        border-left: 4px solid #ff64c8;
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
    }
    .metric-box {
        background: rgba(0, 255, 136, 0.1);
        border: 2px solid #00ff88;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
</style>
""", unsafe_allow_html=True)

st.title("🌌 Realm Advanced Tensor Field & Quantum Dynamics Visualizer")

st.markdown("""
### Advanced 3D Visualization Engine
Explore **dynamic tensor fields**, **quantum geodesics**, **entropy flow**, and **field evolution** with enhanced interactive controls and multiple visualization modes.

> **"Advanced visualization reveals the hidden geometry of quantum reality"** — Realm Theory Axiom
""")

# ============== CORE FUNCTIONS ==============

def tensor_field_advanced(x, y, alpha, beta, field_type='standard'):
    """Multiple tensor field formulations"""
    if field_type == 'standard':
        return alpha * np.sin(np.sqrt(x**2 + y**2)) + beta * np.cos(x * y)
    elif field_type == 'gaussian':
        return alpha * np.exp(-(x**2 + y**2) / (2 * beta**2)) * np.cos(x * y)
    elif field_type == 'wave':
        return alpha * np.sin(x) * np.sin(y) + beta * np.cos(x * y)
    else:
        return alpha * np.sin(x) * np.cos(y) + beta * (x**2 - y**2) / 10

def geodesic_spiral(alpha, beta, turns=4, steps=200):
    """Generate quantum geodesic spiral path"""
    theta = np.linspace(0, turns * 2 * np.pi, steps)
    z_geo = np.linspace(-2, 2, steps)
    r_geo = alpha * np.sin(beta * theta)
    x_geo = r_geo * np.cos(theta)
    y_geo = r_geo * np.sin(theta)
    return x_geo, y_geo, z_geo

def entropy_time_evolution(time_array, alpha, beta):
    """Calculate entropy over time"""
    return np.exp(-0.1 * time_array) * (np.sin(alpha * time_array) + np.cos(beta * time_array))

def shannon_entropy_field(field_data):
    """Calculate Shannon entropy of a field"""
    flat = np.abs(field_data.flatten())
    flat = flat / (np.sum(flat) + 1e-10)
    return -np.sum(flat * np.log(flat + 1e-10))

# ============== MAIN CONTROLS ==============

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("### 🎛️ Primary Parameters")
    alpha = st.slider("α (Curvature Coupling)", 0.1, 5.0, 1.5, 0.1, help="Spatial frequency strength")
    
with col2:
    beta = st.slider("β (Field Feedback)", 0.1, 5.0, 1.5, 0.1, help="Field oscillation response")
    
with col3:
    st.markdown("### 📊 Field Type")
    field_type = st.selectbox("Select Tensor Field Model", 
                              ["standard", "gaussian", "wave", "hybrid"],
                              help="Different mathematical formulations")
    
with col4:
    st.markdown("### 🎨 Color Scheme")
    colormap = st.selectbox("Visualization Colormap", 
                           ["Viridis", "Plasma", "Inferno", "Magma", "Coolwarm", "RdYlBu"])

# ============== SIMULATION GRID ==============

x = np.linspace(-5, 5, 80)
y = np.linspace(-5, 5, 80)
X, Y = np.meshgrid(x, y)

# Main tensor field
Z = tensor_field_advanced(X, Y, alpha, beta, field_type)

# Time evolution arrays
time_array = np.linspace(0, 10, 100)
entropy_time = entropy_time_evolution(time_array, alpha, beta)

# ============== TABS ==============

tabs = st.tabs([
    "🌐 Tensor Field 3D",
    "🧬 Multi-Field Comparison", 
    "🧪 Entropy Timeline",
    "🌀 Geodesic Spirals",
    "📈 Field Statistics",
    "🎥 Field Animation",
    "💾 Export & Analysis",
    "📖 Documentation"
])

# ============== TAB 1: TENSOR FIELD 3D ==============
with tabs[0]:
    st.subheader("🌐 3D Tensor Field R_AB Visualization")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown(f"""
        <div class="equation-box">
        <strong>Field Type:</strong> {field_type.upper()}<br>
        <strong>Current Parameters:</strong><br>
        • α = {alpha:.2f} (Curvature)<br>
        • β = {beta:.2f} (Feedback)<br>
        <strong>Field Range:</strong> [{np.min(Z):.2f}, {np.max(Z):.2f}]
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="metric-box">
        <strong>📊 Stats</strong><br>
        Mean: """ + f"{np.mean(Z):.3f}" + """<br>
        Std: """ + f"{np.std(Z):.3f}" + """<br>
        Entropy: """ + f"{shannon_entropy_field(Z):.3f}" + """
        </div>
        """, unsafe_allow_html=True)
    
    # 3D surface plot using Plotly
    fig1 = go.Figure(data=[go.Surface(z=Z, x=X, y=Y, colorscale=colormap.lower())])
    fig1.update_layout(
        title=f"3D Tensor Field 𝓡_AB ({field_type})",
        scene=dict(
            xaxis_title="X Dimension",
            yaxis_title="Y Dimension",
            zaxis_title="Field Strength 𝓡_AB",
            camera=dict(eye=dict(x=1.5, y=1.5, z=1.3))
        ),
        height=700,
        autosize=True
    )
    st.plotly_chart(fig1, use_container_width=True)
    
    # Contour plot
    st.markdown("#### Field Contour Map")
    fig_contour = plt.figure(figsize=(10, 8))
    ax_contour = fig_contour.add_subplot(111)
    contour = ax_contour.contourf(X, Y, Z, levels=50, cmap=colormap.lower())
    contour_lines = ax_contour.contour(X, Y, Z, levels=20, colors='white', alpha=0.2, linewidths=0.5)
    ax_contour.clabel(contour_lines, inline=True, fontsize=8)
    ax_contour.set_xlabel("X Dimension", fontsize=11)
    ax_contour.set_ylabel("Y Dimension", fontsize=11)
    ax_contour.set_title("Field Distribution - Contour Map", fontweight='bold')
    fig_contour.colorbar(contour, ax=ax_contour, label="Field Strength")
    st.pyplot(fig_contour, use_container_width=True)


# ============== TAB 2: MULTI-FIELD COMPARISON ==============
with tabs[1]:
    st.subheader("🧬 Compare Multiple Field Models")
    
    field_types_compare = ["standard", "gaussian", "wave"]
    
    col1, col2, col3 = st.columns(3)
    
    for idx, (col, ftype) in enumerate(zip([col1, col2, col3], field_types_compare)):
        Z_compare = tensor_field_advanced(X, Y, alpha, beta, ftype)
        entropy_comp = shannon_entropy_field(Z_compare)
        
        with col:
            st.markdown(f"""
            <div class="metric-box">
            <strong>{ftype.upper()}</strong><br>
            Entropy: {entropy_comp:.3f}<br>
            Range: [{np.min(Z_compare):.2f}, {np.max(Z_compare):.2f}]
            </div>
            """, unsafe_allow_html=True)
            
            fig_comp = go.Figure(data=[go.Surface(z=Z_compare, x=X, y=Y, colorscale="viridis")])
            fig_comp.update_layout(
                title=f"{ftype} Model",
                height=500,
                showlegend=False,
                scene=dict(
                    xaxis=dict(showticklabels=False),
                    yaxis=dict(showticklabels=False),
                    zaxis=dict(showticklabels=False)
                )
            )
            st.plotly_chart(fig_comp, use_container_width=True)
    
    # Difference analysis
    st.markdown("#### Field Differences")
    Z_standard = tensor_field_advanced(X, Y, alpha, beta, "standard")
    Z_gaussian = tensor_field_advanced(X, Y, alpha, beta, "gaussian")
    Z_diff = Z_gaussian - Z_standard
    
    fig_diff = go.Figure(data=[go.Surface(z=Z_diff, x=X, y=Y, colorscale="RdBu")])
    fig_diff.update_layout(
        title="Field Difference (Gaussian - Standard)",
        scene=dict(zaxis_title="Δ Field"),
        height=600
    )
    st.plotly_chart(fig_diff, use_container_width=True)


# ============== TAB 3: ENTROPY TIMELINE ==============
with tabs[2]:
    st.subheader("🧪 Entropy & Probability Dynamics Over Time")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        <div class="equation-box">
        <strong>Entropy Evolution:</strong><br>
        H(t) = e^(-0.1t)·(sin(α·t) + cos(β·t))<br>
        <strong>Shannon Entropy:</strong><br>
        H(φ) = -Σ P(x)·log(P(x))
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        decay_rate = st.slider("Decay Rate", 0.01, 0.5, 0.1)
    
    # Time evolution
    t_custom = np.linspace(0, 20, 200)
    h_custom = np.exp(-decay_rate * t_custom) * (np.sin(alpha * t_custom) + np.cos(beta * t_custom))
    
    fig_time = go.Figure()
    fig_time.add_trace(go.Scatter(x=t_custom, y=h_custom, mode='lines+markers',
                                  name='Entropy Flow',
                                  line=dict(color='cyan', width=3),
                                  marker=dict(size=4)))
    fig_time.update_layout(
        title="Entropy/Probability Density Evolution",
        xaxis_title="Time Parameter t",
        yaxis_title="Entropy H(φ) / Probability P(Φ)",
        height=500,
        hovermode='x unified'
    )
    st.plotly_chart(fig_time, use_container_width=True)
    
    # Multiple time slice comparison
    st.markdown("#### Entropy Snapshots at Different Times")
    
    col1, col2, col3, col4 = st.columns(4)
    time_points = [0, 5, 10, 15]
    
    for col, t_pt in zip([col1, col2, col3, col4], time_points):
        with col:
            # Calculate quantum field at time t
            Z_time = np.exp(-t_pt/10) * np.sin(np.sqrt(X**2 + Y**2) - beta * t_pt) * alpha
            entropy_snap = shannon_entropy_field(Z_time)
            
            st.metric(f"t = {t_pt}", f"{entropy_snap:.3f}")
            
            fig_snap = plt.figure(figsize=(6, 5))
            ax_snap = fig_snap.add_subplot(111)
            heatmap = ax_snap.imshow(Z_time, cmap='hot', origin='lower', extent=[-5, 5, -5, 5])
            ax_snap.set_title(f"Field at t={t_pt}")
            ax_snap.set_xlabel("X")
            ax_snap.set_ylabel("Y")
            fig_snap.colorbar(heatmap, ax=ax_snap)
            st.pyplot(fig_snap, use_container_width=True)


# ============== TAB 4: GEODESIC SPIRALS ==============
with tabs[3]:
    st.subheader("🌀 Quantum Geodesic Spiral Paths")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        <div class="equation-box">
        <strong>Parametric Spiral:</strong><br>
        r = α·sin(β·θ)<br>
        x = r·cos(θ), y = r·sin(θ)<br>
        z = linear progression
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        num_turns = st.slider("Spiral Turns", 1, 10, 4)
    
    x_geo, y_geo, z_geo = geodesic_spiral(alpha, beta, num_turns, 300)
    
    # 3D spiral
    fig_spiral = go.Figure()
    fig_spiral.add_trace(go.Scatter3d(
        x=x_geo, y=y_geo, z=z_geo,
        mode='lines',
        line=dict(color='cyan', width=4),
        name='Geodesic Path'
    ))
    fig_spiral.add_trace(go.Scatter3d(
        x=[x_geo[0]], y=[y_geo[0]], z=[z_geo[0]],
        mode='markers',
        marker=dict(color='blue', size=12),
        name='Start Point'
    ))
    fig_spiral.add_trace(go.Scatter3d(
        x=[x_geo[-1]], y=[y_geo[-1]], z=[z_geo[-1]],
        mode='markers',
        marker=dict(color='orange', size=12),
        name='End Point'
    ))
    
    fig_spiral.update_layout(
        title="Quantum Geodesic Spiral Through Realm",
        scene=dict(
            xaxis_title='X Dimension',
            yaxis_title='Y Dimension',
            zaxis_title='Z Dimension (Path Progress)'
        ),
        height=700,
        hovermode='closest'
    )
    st.plotly_chart(fig_spiral, use_container_width=True)
    
    # Path statistics
    path_length = np.sum(np.sqrt(np.diff(x_geo)**2 + np.diff(y_geo)**2 + np.diff(z_geo)**2))
    
    st.markdown("""
    <div class="metric-box">
    📏 <strong>Path Metrics:</strong><br>
    """ + f"Total Length: {path_length:.2f} units<br>" + f"""
    Number of Turns: """ + str(num_turns) + f"""<br>
    Max Radial Distance: {np.max(np.sqrt(x_geo**2 + y_geo**2)):.2f} units
    </div>
    """, unsafe_allow_html=True)


# ============== TAB 5: FIELD STATISTICS ==============
with tabs[4]:
    st.subheader("📈 Advanced Field Statistics & Analysis")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Statistical Summary")
        stats_data = {
            'Metric': ['Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Range', 'Entropy'],
            'Value': [
                f"{np.mean(Z):.4f}",
                f"{np.median(Z):.4f}",
                f"{np.std(Z):.4f}",
                f"{np.min(Z):.4f}",
                f"{np.max(Z):.4f}",
                f"{np.max(Z) - np.min(Z):.4f}",
                f"{shannon_entropy_field(Z):.4f}"
            ]
        }
        st.table(stats_data)
    
    with col2:
        st.markdown("#### Histogram Distribution")
        fig_hist = plt.figure(figsize=(8, 5))
        ax_hist = fig_hist.add_subplot(111)
        ax_hist.hist(Z.flatten(), bins=50, color='cyan', alpha=0.7, edgecolor='white')
        ax_hist.set_xlabel("Field Value")
        ax_hist.set_ylabel("Frequency")
        ax_hist.set_title("Field Value Distribution")
        ax_hist.grid(alpha=0.3)
        st.pyplot(fig_hist, use_container_width=True)
    
    # Gradient analysis
    st.markdown("#### Spatial Gradient Analysis")
    grad_x = np.gradient(Z, axis=1)
    grad_y = np.gradient(Z, axis=0)
    grad_magnitude = np.sqrt(grad_x**2 + grad_y**2)
    
    fig_grad = go.Figure(data=[go.Surface(z=grad_magnitude, x=X, y=Y, colorscale="Inferno")])
    fig_grad.update_layout(
        title="Field Gradient Magnitude |∇Z|",
        scene=dict(zaxis_title="Gradient Magnitude"),
        height=600
    )
    st.plotly_chart(fig_grad, use_container_width=True)


# ============== TAB 6: FIELD ANIMATION ==============
with tabs[5]:
    st.subheader("🎥 Field Evolution Animation")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.info("📺 Watch how the quantum field evolves over time as parameters change")
    
    with col2:
        time_steps = st.slider("Animation Frames", 5, 50, 20)
    
    # Generate time-evolved fields
    progress_bar = st.progress(0)
    animation_frames = []
    
    for i, t in enumerate(np.linspace(0, 2*np.pi, time_steps)):
        Z_anim = np.exp(-t/10) * np.cos(np.sqrt(X**2 + Y**2) - beta * t) * alpha * np.sin(t)
        animation_frames.append(Z_anim)
        progress_bar.progress((i + 1) / time_steps)
    
    # Create animated plot
    col1, col2, col3 = st.columns(3)
    with col1:
        frame_select = st.slider("Frame", 0, len(animation_frames) - 1, 0)
    
    with col2:
        if st.button("▶️ Play Animation"):
            for frame_idx in range(len(animation_frames)):
                st.session_state.current_frame = frame_idx
    
    with col3:
        st.markdown(f"Frame: {frame_select}/{len(animation_frames) - 1}")
    
    # Display current frame
    Z_current = animation_frames[frame_select]
    
    fig_anim = go.Figure(data=[go.Surface(z=Z_current, x=X, y=Y, colorscale="Plasma")])
    fig_anim.update_layout(
        title=f"Field Evolution - Frame {frame_select}",
        scene=dict(
            xaxis_title="X",
            yaxis_title="Y",
            zaxis_title="Field Strength"
        ),
        height=600
    )
    st.plotly_chart(fig_anim, use_container_width=True)


# ============== TAB 7: EXPORT & ANALYSIS ==============
with tabs[6]:
    st.subheader("💾 Data Export & Analysis")
    
    st.markdown("#### Download Simulation Data")
    
    # Prepare export data
    export_data = {
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'field_type': field_type,
            'parameters': {
                'alpha': float(alpha),
                'beta': float(beta)
            }
        },
        'field_data': {
            'x_range': [-5, 5],
            'y_range': [-5, 5],
            'grid_size': [len(x), len(y)],
            'z_values': Z.tolist(),
            'statistics': {
                'mean': float(np.mean(Z)),
                'std': float(np.std(Z)),
                'min': float(np.min(Z)),
                'max': float(np.max(Z)),
                'entropy': float(shannon_entropy_field(Z))
            }
        },
        'geodesic_data': {
            'x': x_geo.tolist(),
            'y': y_geo.tolist(),
            'z': z_geo.tolist()
        },
        'entropy_timeline': {
            'time': time_array.tolist(),
            'entropy': entropy_time.tolist()
        }
    }
    
    json_export = json.dumps(export_data, indent=2)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.download_button(
            label="⬇️ Download JSON",
            data=json_export,
            file_name=f"realm_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )
    
    with col2:
        st.download_button(
            label="⬇️ Download CSV (Field Data)",
            data=np.array2string(Z),
            file_name=f"realm_field_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    
    # Data summary
    st.markdown("#### Export Summary")
    st.json({
        'Field Type': field_type,
        'Alpha': float(alpha),
        'Beta': float(beta),
        'Grid Points': len(x) * len(y),
        'File Size': f"{len(json_export) / 1024:.1f} KB"
    })
    
    st.markdown("#### 🧩 Unity Game Engine Integration")
    st.code("""
// C# code to import Realm data into Unity
using UnityEngine;
using Newtonsoft.Json;

public class RealmDataImporter : MonoBehaviour 
{
    [System.Serializable]
    public class RealmData
    {
        public RealmMetadata metadata;
        public FieldData field_data;
        public GeodesicData geodesic_data;
    }
    
    public RealmData data;
    
    void Start()
    {
        string json = System.IO.File.ReadAllText("realm_data.json");
        data = JsonConvert.DeserializeObject<RealmData>(json);
        
        // Create mesh from field data
        CreateFieldMesh();
    }
    
    void CreateFieldMesh()
    {
        // Implementation here
    }
}
    """, language='csharp')


# ============== TAB 8: DOCUMENTATION ==============
with tabs[7]:
    st.subheader("📖 Complete Theory & User Guide")
    
    st.markdown("""
    ### 🔬 **Realm Theory Overview**
    
    The Realm represents a unified mathematical framework for understanding quantum entanglement and spacetime curvature through geometric principles.
    
    ---
    
    ### 📐 **Core Equations**
    
    #### 1. Tensor Field Models
    
    **Standard Model:**
    ```
    R_AB(x,y) = α·sin(√(x² + y²)) + β·cos(x·y)
    ```
    
    **Gaussian Model:**
    ```
    R_AB(x,y) = α·e^(-(x²+y²)/(2β²))·cos(x·y)
    ```
    
    **Wave Model:**
    ```
    R_AB(x,y) = α·sin(x)·sin(y) + β·cos(x·y)
    ```
    
    #### 2. Entropy Evolution
    ```
    H(t) = e^(-λt)·(sin(α·t) + cos(β·t))
    ```
    where λ is the decay rate
    
    #### 3. Geodesic Spiral
    ```
    Parametric Form:
    r(θ) = α·sin(β·θ)
    x(θ) = r(θ)·cos(θ)
    y(θ) = r(θ)·sin(θ)
    z(θ) = linear progression
    ```
    
    #### 4. Shannon Entropy
    ```
    H(φ) = -Σ P(x)·log(P(x))
    P(x) = |ψ(x)|² / Σ|ψ(x)|²
    ```
    
    ---
    
    ### 🎛️ **Parameter Guide**
    
    | Parameter | Range | Purpose |
    |-----------|-------|---------|
    | **α (Alpha)** | 0.1 - 5.0 | Controls curvature coupling strength |
    | **β (Beta)** | 0.1 - 5.0 | Controls field feedback & oscillation |
    | **Field Type** | standard, gaussian, wave, hybrid | Mathematical model selection |
    | **Time Decay** | 0.01 - 0.5 | Entropy dissipation rate |
    
    ---
    
    ### 💡 **Key Concepts**
    
    **Geodesic:** The shortest path between two points in curved spacetime
    **Entropy:** Measure of information complexity and uncertainty
    **Tensor Field:** Mathematical representation of spacetime curvature
    **Quantum Entanglement:** Correlation between distant particles via geodesic paths
    
    ---
    
    ### 🚀 **Applications**
    
    ✅ Quantum computing optimization
    ✅ Spacetime navigation
    ✅ Information flow analysis
    ✅ Game engine integration
    ✅ Machine learning in field theory
    
    ---
    
    ### 📊 **Visualization Modes**
    
    - **3D Surface:** Full field visualization in three dimensions
    - **Contour Maps:** 2D field distribution analysis
    - **Spirals:** Geodesic path trajectories
    - **Entropy Timeline:** Information evolution over time
    - **Statistics:** Detailed numerical analysis
    - **Animation:** Dynamic field evolution
    
    """)
    
    st.markdown("---")
    st.info("💾 Use the **Export & Analysis** tab to download data for further research or game engine integration!")

# ============== FOOTER ==============
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #888; font-size: 12px;">
    <p>🌌 <strong>Realm Advanced Visualizer v2.0</strong></p>
    <p>Quantum Field Dynamics • Tensor Analysis • Geodesic Computation</p>
    <p><em>"Geometry is the language of the universe"</em></p>
</div>
""", unsafe_allow_html=True)
