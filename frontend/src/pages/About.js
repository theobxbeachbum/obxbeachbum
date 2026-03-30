import aboutImage from "../images/roy-sandie.jpg";

function About() {
  return (
    <div className="info-page">
      <h1>About the OBX Beach Bum</h1>

      <img
        src={aboutImage}
        alt="Roy and Sandie on the Outer Banks"
      />

      <p>Hi, I’m Roy Edlund — the OBX Beach Bum.</p>

      <p>
        And that pretty lady with her arms wrapped around me? That’s Sandie —
        my girlfriend of (almost) 45 years.
      </p>

      <p>
        Without her love and support, I’d just be some old guy wandering the
        beach with a couple of cameras, muttering to himself.
      </p>

      <p>
        …Actually, if I’m being honest, I am that old guy. But I wouldn’t be
        nearly as happy.
      </p>

      <p>
        Together, we are the OBX Beach Bum. Any success I’ve had as a photographer,
        I owe to her.
      </p>

      <h2>How This All Started</h2>

      <p>
        After losing everything in 2008, life got heavy. One afternoon I said,
        “If we’re going to be poor, let’s be poor at the beach.”
      </p>

      <p>
        So in 2012, we packed up and moved to the Outer Banks.
      </p>

      <h2>The Beach Changed Me</h2>

      <p>
        I walked the beach every day, rain or shine… and somewhere along the way,
        I changed.
      </p>

      <p>
        Photography became something that healed me. Life slowed down. Peace showed up.
        I was happy.
      </p>

      <h2>From Here</h2>

      <p>
        That life is still growing, and if you’re here — browsing, buying, or just
        enjoying a moment — you’re part of it now too.
      </p>

      <p><strong>Love from here. ❤️</strong></p>
    </div>
  );
}

export default About;
